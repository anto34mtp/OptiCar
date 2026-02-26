import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OcrResult {
  pricePerLiter: number | null;
  liters: number | null;
  totalPrice: number | null;
  fuelType: string | null;
  confidence: number;
  rawText: string;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaUrl = this.configService.get<string>('OLLAMA_URL', 'http://192.168.100.32:11434');
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL', 'gemini-3-flash-preview:latest');
  }

  async analyzeImage(
    imageBase64: string,
    sourceType: 'ticket' | 'pump',
  ): Promise<OcrResult> {
    try {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const prompt = this.buildPrompt(sourceType);

      // Call Ollama API with vision
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          images: [base64Data],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result: OllamaResponse = await response.json();
      const rawText = result.response;

      this.logger.log(`Ollama response:\n${rawText}`);

      // Parse the JSON response from Ollama
      const parsed = this.parseOllamaResponse(rawText);

      // Validate parsed data
      const validatedData = this.validateAndNormalize(parsed);

      return {
        ...validatedData,
        confidence: 0.9, // Ollama doesn't provide confidence, assume high
        rawText,
      };
    } catch (error) {
      this.logger.error(`OCR processing failed: ${error}`);
      throw new BadRequestException(
        `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildPrompt(sourceType: 'ticket' | 'pump'): string {
    const context = sourceType === 'ticket'
      ? "un ticket de caisse d'une station essence"
      : "un écran de pompe à essence";

    return `Analyse cette image de ${context} et extrait les informations de carburant.

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans texte avant ou après) au format suivant:
{
  "pricePerLiter": <nombre ou null>,
  "liters": <nombre ou null>,
  "totalPrice": <nombre ou null>,
  "fuelType": "<type de carburant ou null>"
}

- pricePerLiter: prix au litre en euros (ex: 1.789)
- liters: quantité de litres (ex: 45.32)
- totalPrice: prix total en euros (ex: 81.05)
- fuelType: type de carburant (SP95, SP98, E10, E85, Gazole, etc.)

Si une valeur n'est pas visible ou lisible, mets null.`;
  }

  private parseOllamaResponse(response: string): {
    pricePerLiter: number | null;
    liters: number | null;
    totalPrice: number | null;
    fuelType: string | null;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          pricePerLiter: typeof parsed.pricePerLiter === 'number' ? parsed.pricePerLiter : null,
          liters: typeof parsed.liters === 'number' ? parsed.liters : null,
          totalPrice: typeof parsed.totalPrice === 'number' ? parsed.totalPrice : null,
          fuelType: typeof parsed.fuelType === 'string' ? parsed.fuelType : null,
        };
      }
    } catch (e) {
      this.logger.warn(`Failed to parse Ollama response as JSON: ${e}`);
    }

    return {
      pricePerLiter: null,
      liters: null,
      totalPrice: null,
      fuelType: null,
    };
  }

  async analyzeMaintenanceInvoice(imageBase64: string): Promise<{
    date: string | null;
    mileage: number | null;
    totalPrice: number | null;
    partTypes: string[];
    garage: string | null;
    rawText: string;
  }> {
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `Analyse cette image d'une facture d'entretien automobile et extrait les informations.

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans texte avant ou après) au format suivant:
{
  "date": "<date au format YYYY-MM-DD ou null>",
  "mileage": <kilométrage entier ou null>,
  "totalPrice": <montant total en euros ou null>,
  "partTypes": ["<types de pièces>"],
  "garage": "<nom du garage ou null>"
}

Pour partTypes, utilise les codes suivants selon les mots-clés trouvés:
- vidange, huile moteur → "VIDANGE"
- filtre à air → "FILTRE_AIR"
- filtre carburant, filtre gasoil → "FILTRE_CARBURANT"
- bougies → "BOUGIES"
- filtre habitacle, filtre pollen → "FILTRE_HABITACLE"
- kit distribution, courroie distribution → "KIT_DISTRIBUTION"
- pompe à eau → "POMPE_EAU"
- courroie accessoires, courroie alternateur → "COURROIE_ACCESSOIRES"
- liquide refroidissement, antigel → "LIQUIDE_REFROIDISSEMENT"
- plaquettes avant → "PLAQUETTES_AV"
- plaquettes arrière → "PLAQUETTES_AR"
- disques avant → "DISQUES_AV"
- disques arrière → "DISQUES_AR"
- liquide frein → "LIQUIDE_FREIN"
- pneus, pneumatiques → "PNEUS"
- batterie → "BATTERIE"
- contrôle technique → "CONTROLE_TECHNIQUE"

Si une valeur n'est pas visible ou lisible, mets null (ou tableau vide pour partTypes).`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          images: [base64Data],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result: OllamaResponse = await response.json();
      const rawText = result.response;
      this.logger.log(`Ollama maintenance response:\n${rawText}`);

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            date: typeof parsed.date === 'string' ? parsed.date : null,
            mileage: typeof parsed.mileage === 'number' ? parsed.mileage : null,
            totalPrice: typeof parsed.totalPrice === 'number' ? parsed.totalPrice : null,
            partTypes: Array.isArray(parsed.partTypes) ? parsed.partTypes : [],
            garage: typeof parsed.garage === 'string' ? parsed.garage : null,
            rawText,
          };
        }
      } catch (e) {
        this.logger.warn(`Failed to parse maintenance OCR response: ${e}`);
      }

      return { date: null, mileage: null, totalPrice: null, partTypes: [], garage: null, rawText };
    } catch (error) {
      this.logger.error(`Maintenance OCR failed: ${error}`);
      throw new BadRequestException(
        `Maintenance OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private validateAndNormalize(data: {
    pricePerLiter: number | null;
    liters: number | null;
    totalPrice: number | null;
    fuelType: string | null;
  }): {
    pricePerLiter: number | null;
    liters: number | null;
    totalPrice: number | null;
    fuelType: string | null;
  } {
    let { pricePerLiter, liters, totalPrice, fuelType } = data;

    // Try to calculate missing values if we have 2 out of 3
    if (pricePerLiter && liters && !totalPrice) {
      totalPrice = Math.round(pricePerLiter * liters * 100) / 100;
    } else if (pricePerLiter && totalPrice && !liters) {
      liters = Math.round((totalPrice / pricePerLiter) * 100) / 100;
    } else if (liters && totalPrice && !pricePerLiter) {
      pricePerLiter = Math.round((totalPrice / liters) * 1000) / 1000;
    }

    // Validate ranges
    if (pricePerLiter && (pricePerLiter < 0.5 || pricePerLiter > 5)) {
      pricePerLiter = null;
    }
    if (liters && (liters < 1 || liters > 150)) {
      liters = null;
    }
    if (totalPrice && (totalPrice < 1 || totalPrice > 500)) {
      totalPrice = null;
    }

    return { pricePerLiter, liters, totalPrice, fuelType };
  }
}
