import {
  IsOptional,
  IsInt,
  IsPositive,
  IsIn,
} from 'class-validator';

const CATEGORIES = [
  'MOTEUR',
  'CLIMATISATION',
  'DISTRIBUTION',
  'FREINAGE',
  'LIAISON_SOL',
  'ADMINISTRATIF',
] as const;

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
  'PNEUS',
  'BATTERIE',
  'CONTROLE_TECHNIQUE',
] as const;

export class UpdateMaintenanceRuleDto {
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(PART_TYPES)
  partType?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalKm?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalMonths?: number;
}
