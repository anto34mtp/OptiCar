import { Injectable } from '@nestjs/common';

interface ParseResult {
  pricePerLiter: number | null;
  liters: number | null;
  totalPrice: number | null;
  fuelType: string | null;
}

@Injectable()
export class TicketParser {
  // Patterns for price per liter
  private readonly pricePerLiterPatterns = [
    /(\d+[.,]\d{2,3})\s*€?\s*\/\s*L/i,
    /PU\s*:?\s*(\d+[.,]\d{2,3})/i,
    /PRIX\s*(?:UNIT(?:AIRE)?|\/L)?\s*[€:]\s*(\d+[.,]\d{2,3})/i,
    /(\d+[.,]\d{3})\s*EUR/i,
    /€\s*(\d+[.,]\d{2,3})\s*\/\s*L/i,
    /PRIX\s*€?\s*(\d+[.,]\d{2,3})/i,
  ];

  // Patterns for liters
  private readonly litersPatterns = [
    /(\d+[.,]\d{1,3})\s*L(?:itres?)?/i,
    /VOL(?:UME)?\s*:?\s*(\d+[.,]\d{1,3})/i,
    /QTE\s*:?\s*(\d+[.,]\d{1,3})/i,
    /QUANTITE\s*:?\s*(\d+[.,]\d{1,3})/i,
    /(\d+[.,]\d{2})\s*L\b/i,
    /VOLUME\s+(\d+[.,]\d{1,3})/i,
    /(\d{1,2}[.,]\d{2})\s*(?:L|l|litres?)/i,
  ];

  // Patterns for total price
  private readonly totalPricePatterns = [
    /TOTAL\s*(?:TTC)?\s*:?\s*(\d+[.,]\d{2})\s*€?/i,
    /MONTANT\s*(?:REEL)?\s*:?\s*(?:EUR)?\s*(\d+[.,]\d{2})/i,
    /A\s*PAYER\s*:?\s*(\d+[.,]\d{2})/i,
    /€\s*(\d+[.,]\d{2})$/im,
    /(\d+[.,]\d{2})\s*€\s*$/im,
    /NET\s*(?:A\s*PAYER)?\s*[€:]\s*(\d+[.,]\d{2})/i,
    /EUR\s*(\d+[.,]\d{2})/i,
    /NET\s*€\s*(\d+[.,]\d{2})/i,
  ];

  // Patterns for fuel type
  private readonly fuelTypePatterns = [
    /(SP\s*95|SANS\s*PLOMB\s*95)/i,
    /(SP\s*98|SANS\s*PLOMB\s*98)/i,
    /(E10|SP95-E10)/i,
    /(E85|ETHANOL|BIO\s*ETHANOL)/i,
    /(DIESEL|GAZOLE|GASOIL|G[AE][ZS]OLE|GO)\b/i,
    /(GPL|GAZ)/i,
    /(G[EI]OLE|G[OD][ZS]OLE)/i, // OCR errors for GAZOLE
  ];

  parse(text: string): ParseResult {
    const normalizedText = this.normalizeText(text);

    return {
      pricePerLiter: this.extractPricePerLiter(normalizedText),
      liters: this.extractLiters(normalizedText),
      totalPrice: this.extractTotalPrice(normalizedText),
      fuelType: this.extractFuelType(normalizedText),
    };
  }

  private normalizeText(text: string): string {
    return text
      .replace(/[oO]/g, (match, offset, str) => {
        // Replace O with 0 only if surrounded by digits
        const before = str[offset - 1];
        const after = str[offset + 1];
        if (/\d/.test(before) || /\d/.test(after)) {
          return '0';
        }
        return match;
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractNumber(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return null;
  }

  private extractPricePerLiter(text: string): number | null {
    return this.extractNumber(text, this.pricePerLiterPatterns);
  }

  private extractLiters(text: string): number | null {
    return this.extractNumber(text, this.litersPatterns);
  }

  private extractTotalPrice(text: string): number | null {
    return this.extractNumber(text, this.totalPricePatterns);
  }

  private extractFuelType(text: string): string | null {
    for (const pattern of this.fuelTypePatterns) {
      const match = text.match(pattern);
      if (match) {
        const fuelType = match[1].toUpperCase().replace(/\s+/g, '');

        // Normalize fuel type names
        if (fuelType.includes('SP95') || fuelType.includes('SANSPLOMB95')) {
          return 'SP95';
        }
        if (fuelType.includes('SP98') || fuelType.includes('SANSPLOMB98')) {
          return 'SP98';
        }
        if (fuelType.includes('E10')) {
          return 'E10';
        }
        if (fuelType.includes('E85') || fuelType.includes('ETHANOL')) {
          return 'E85';
        }
        if (fuelType.includes('DIESEL') || fuelType.includes('GAZOLE') || fuelType.includes('GASOIL') || fuelType === 'GO') {
          return 'DIESEL';
        }
        // Handle OCR errors for GAZOLE (GEOLE, GIZOLE, etc.)
        if (/G[EI]OLE|G[OD][ZS]OLE/.test(fuelType)) {
          return 'DIESEL';
        }

        return fuelType;
      }
    }
    return null;
  }
}
