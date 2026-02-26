import api from './api';

export interface OcrResult {
  pricePerLiter: number | null;
  liters: number | null;
  totalPrice: number | null;
  fuelType: string | null;
  confidence: number;
  rawText: string;
}

export interface OcrResponse {
  success: boolean;
  data: OcrResult;
}

export const ocrService = {
  async analyze(image: string, sourceType: 'ticket' | 'pump'): Promise<OcrResponse> {
    const response = await api.post('/ocr/analyze', {
      image,
      sourceType,
    });
    return response.data;
  },
};
