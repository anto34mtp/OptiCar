import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  IsIn,
} from 'class-validator';

const INSURANCE_TYPES = ['MENSUEL', 'TRIMESTRIEL', 'SEMESTRIEL', 'ANNUEL'] as const;

export class CreateInsuranceDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(INSURANCE_TYPES)
  type: string;

  @IsOptional()
  @IsString()
  insurer?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
