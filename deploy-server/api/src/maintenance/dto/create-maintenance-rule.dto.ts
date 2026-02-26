import {
  IsString,
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
  'PNEUS_AV',
  'PNEUS_AR',
  'BATTERIE',
  'CONTROLE_TECHNIQUE',
] as const;

export class CreateMaintenanceRuleDto {
  @IsIn(CATEGORIES)
  category: string;

  @IsIn(PART_TYPES)
  partType: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalKm?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  intervalMonths?: number;
}
