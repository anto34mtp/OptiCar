import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsIn,
} from 'class-validator';

const SOURCE_TYPES = ['TICKET', 'PUMP', 'MANUAL'] as const;

export class UpdateRefuelDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(10000000)
  mileage?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(10)
  pricePerLiter?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(200)
  liters?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(1000)
  totalPrice?: number;

  @IsOptional()
  @IsIn(SOURCE_TYPES)
  sourceType?: string;
}
