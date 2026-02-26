import { Injectable } from '@nestjs/common';

interface ParseResult {
  pricePerLiter: number | null;
  liters: number | null;
  totalPrice: number | null;
  fuelType: string | null;
}

@Injectable()
export class PumpParser {
  // Pump displays typically show cleaner, larger numbers
  // Patterns optimized for pump screen OCR

  private readonly pricePerLiterPatterns = [
    /(\d+[.,]\d{3})\s*€?\s*\/?\s*L/i,
    /€\s*(\d+[.,]\d{3})/i,
    /(\d+[.,]\d{3})/g, // Often just the number with 3 decimals
  ];

  private readonly litersPatterns = [
    /(\d+[.,]\d{2})\s*L/i,
    /L\s*(\d+[.,]\d{2})/i,
    /LITRES?\s*:?\s*(\d+[.,]\d{2})/i,
  ];

  private readonly totalPricePatterns = [
    /€\s*(\d+[.,]\d{2})$/m,
    /(\d+[.,]\d{2})\s*€/,
    /TOTAL\s*:?\s*(\d+[.,]\d{2})/i,
    /(\d{2,3}[.,]\d{2})/, // Often just the total with 2 decimals
  ];

  private readonly fuelTypePatterns = [
    /(SP\s*95)/i,
    /(SP\s*98)/i,
    /(E10)/i,
    /(E85)/i,
    /(DIESEL|GAZOLE)/i,
    /(EXCELLIUM)/i,
    /(EFFITEC)/i,
  ];

  parse(text: string): ParseResult {
    const normalizedText = this.normalizeText(text);
    const lines = normalizedText.split('\n').filter(line => line.trim());

    // Pump displays usually show values in a specific layout
    // Try to extract from the most prominent numbers
    const numbers = this.extractAllNumbers(normalizedText);

    return {
      pricePerLiter: this.extractPricePerLiter(normalizedText, numbers),
      liters: this.extractLiters(normalizedText, numbers),
      totalPrice: this.extractTotalPrice(normalizedText, numbers),
      fuelType: this.extractFuelType(normalizedText),
    };
  }

  private normalizeText(text: string): string {
    return text
      .replace(/[lI]/g, (match, offset, str) => {
        // Replace l/I with 1 if in number context
        const before = str[offset - 1];
        const after = str[offset + 1];
        if (/\d/.test(before) || /\d/.test(after)) {
          return '1';
        }
        return match;
      })
      .replace(/[oO]/g, (match, offset, str) => {
        const before = str[offset - 1];
        const after = str[offset + 1];
        if (/\d/.test(before) || /\d/.test(after)) {
          return '0';
        }
        return match;
      })
      .trim();
  }

  private extractAllNumbers(text: string): number[] {
    const matches = text.match(/\d+[.,]\d+/g) || [];
    return matches
      .map(m => parseFloat(m.replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0);
  }

  private extractPricePerLiter(text: string, numbers: number[]): number | null {
    // Try explicit patterns first
    for (const pattern of this.pricePerLiterPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value >= 1 && value <= 3) {
          return value;
        }
      }
    }

    // Look for numbers with 3 decimal places (typical for price/L)
    const pricePerLiter = numbers.find(n => {
      const str = n.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      return decimals >= 3 && n >= 1 && n <= 3;
    });

    return pricePerLiter || null;
  }

  private extractLiters(text: string, numbers: number[]): number | null {
    // Try explicit patterns first
    for (const pattern of this.litersPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value >= 1 && value <= 150) {
          return value;
        }
      }
    }

    // Look for numbers in liters range (typically 10-80L)
    const liters = numbers.find(n => n >= 5 && n <= 100);
    return liters || null;
  }

  private extractTotalPrice(text: string, numbers: number[]): number | null {
    // Try explicit patterns first
    for (const pattern of this.totalPricePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value >= 5 && value <= 300) {
          return value;
        }
      }
    }

    // Look for numbers in total price range
    const total = numbers.find(n => n >= 10 && n <= 200);
    return total || null;
  }

  private extractFuelType(text: string): string | null {
    for (const pattern of this.fuelTypePatterns) {
      const match = text.match(pattern);
      if (match) {
        const fuelType = match[1].toUpperCase().replace(/\s+/g, '');

        if (fuelType.includes('SP95')) return 'SP95';
        if (fuelType.includes('SP98')) return 'SP98';
        if (fuelType.includes('E10')) return 'E10';
        if (fuelType.includes('E85')) return 'E85';
        if (fuelType.includes('DIESEL') || fuelType.includes('GAZOLE')) return 'DIESEL';
        if (fuelType.includes('EXCELLIUM')) return 'DIESEL'; // Total premium diesel
        if (fuelType.includes('EFFITEC')) return 'SP95'; // Avia fuel

        return fuelType;
      }
    }
    return null;
  }
}
