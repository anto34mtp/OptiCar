import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsEnum } from 'class-validator';

class AnalyzeDto {
  @IsString()
  image: string;

  @IsEnum(['ticket', 'pump'])
  sourceType: 'ticket' | 'pump';
}

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('analyze')
  async analyze(@Body() dto: AnalyzeDto) {
    const result = await this.ocrService.analyzeImage(dto.image, dto.sourceType);

    return {
      success: true,
      data: result,
    };
  }
}
