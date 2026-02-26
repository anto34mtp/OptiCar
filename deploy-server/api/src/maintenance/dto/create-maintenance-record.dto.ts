import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsPositive,
  IsDateString,
  IsIn,
  Min,
  Max,
} from 'class-validator';

const PART_TYPES = [
  'VIDANGE',
  'FILTRE_AIR',
  'FILTRE_CARBURANT',
  'BOUGIES',
  'FILTRE_HABITACLE',
  'KIT_DISTRIBUTION',
  'POMPE_EAU',
  'COURROIE_ACCESSOIRES',
  'LIQUIDE_REFROIDISSEMENT',
  'PLAQUETTES_AV',
  'PLAQUETTES_AR',
  'DISQUES_AV',
  'DISQUES_AR',
  'LIQUIDE_FREIN',
  'PNEUS_AV',
  'PNEUS_AR',
  'BATTERIE',
  'CONTROLE_TECHNIQUE',
] as const;

const SOURCE_TYPES = ['MANUAL', 'SCAN'] as const;

export class CreateMaintenanceRecordDto {
  @IsDateString()
  date: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10000000)
  mileage: number;

  @IsIn(PART_TYPES)
  partType: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsString()
  garage?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsIn(SOURCE_TYPES)
  sourceType: string;

  @IsOptional()
  @IsString()
  scanFileUrl?: string;
}
