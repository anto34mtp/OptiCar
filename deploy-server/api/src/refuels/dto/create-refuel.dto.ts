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

export class CreateRefuelDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(10000000)
  mileage: number;

  @IsNumber()
  @IsPositive()
  @Max(10)
  pricePerLiter: number;

  @IsNumber()
  @IsPositive()
  @Max(200)
  liters: number;

  @IsNumber()
  @IsPositive()
  @Max(1000)
  totalPrice: number;

  @IsIn(SOURCE_TYPES)
  sourceType: string;
}
