import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';

const FUEL_TYPES = ['SP95', 'SP98', 'E10', 'E85', 'DIESEL', 'ELECTRIC'] as const;

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuelType?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  co2PerKm?: number | null;
}
