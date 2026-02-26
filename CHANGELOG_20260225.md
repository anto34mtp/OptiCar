# Changelog OptiCar v2 — 25/02/2026

## Feature 1 : Scission Pneus (PNEUS → PNEUS_AV / PNEUS_AR)

### API
- `maintenance/maintenance.service.ts` : DEFAULT_RULES — `PNEUS (40000km/48mo)` remplacé par `PNEUS_AV (30000km/36mo)` + `PNEUS_AR (40000km/48mo)`
- `maintenance/dto/create-maintenance-rule.dto.ts` : PART_TYPES mis à jour (PNEUS_AV, PNEUS_AR)
- `maintenance/dto/create-maintenance-record.dto.ts` : PART_TYPES mis à jour (PNEUS_AV, PNEUS_AR)

### Migration SQL requise
```sql
-- Créer les règles PNEUS_AR à partir des existantes PNEUS
INSERT INTO maintenance_rules (id, vehicleId, category, partType, intervalKm, intervalMonths, createdAt, updatedAt)
SELECT UUID(), vehicleId, 'LIAISON_SOL', 'PNEUS_AR', 40000, 48, NOW(), NOW()
FROM maintenance_rules WHERE partType = 'PNEUS';

-- Convertir les PNEUS existants en PNEUS_AV
UPDATE maintenance_rules SET partType = 'PNEUS_AV', intervalKm = 30000, intervalMonths = 36 WHERE partType = 'PNEUS';
UPDATE maintenance_records SET partType = 'PNEUS_AV' WHERE partType = 'PNEUS';
```

### Mobile (5 fichiers)
- `src/screens/MaintenanceScreen.tsx` : PART_TYPE_LABELS PNEUS_AV/AR
- `src/screens/VehicleMaintenanceScreen.tsx` : PART_TYPE_LABELS PNEUS_AV/AR
- `src/screens/MaintenanceRulesScreen.tsx` : PART_TYPE_LABELS PNEUS_AV/AR
- `src/screens/AddMaintenanceScreen.tsx` : PART_TYPES + PART_TYPE_LABELS PNEUS_AV/AR
- `src/services/notifications.ts` : PART_TYPE_LABELS PNEUS_AV/AR

---

## Feature 2 : Module Éco CO2

### API
- `prisma/schema.prisma` : Ajout champ `co2PerKm Int?` sur le modèle Vehicle
- `vehicles/dto/create-vehicle.dto.ts` : Ajout champ `co2PerKm` (optionnel, Int, 0-1000)
- `vehicles/dto/update-vehicle.dto.ts` : Ajout champ `co2PerKm` (optionnel, nullable)
- `stats/stats.service.ts` : Nouvelle méthode `getCo2Stats(userId)` — calcul émissions totales, par mois, par année, par véhicule
- `stats/stats.controller.ts` : Nouvel endpoint `GET /stats/co2`

### Migration Prisma requise
```bash
npx prisma migrate dev --name add-co2-per-km
```

### Mobile
- `src/services/api.ts` : Ajout `co2PerKm` dans vehiclesService.create, ajout `statsService.getCo2Stats()`
- `src/screens/VehiclesScreen.tsx` : Nouveau champ CO2 g/km dans le formulaire de création véhicule
- `src/screens/DashboardScreen.tsx` : Carte résumé CO2 total (thème vert)
- **NOUVEAU** `src/screens/EcoScreen.tsx` : Dashboard CO2 complet (émissions totales, barres mensuelles, grille annuelle, détail par véhicule)
- `src/navigation/RootNavigator.tsx` : Remplacement onglet Stats par onglet Eco (🌱)

---

## Feature 3 : Toggles Notifications ON/OFF

### Mobile uniquement (pas de changement API)
- **NOUVEAU** `src/stores/notificationSettingsStore.ts` : Store Zustand avec AsyncStorage
  - `globalEnabled` (booléen, défaut true)
  - `disabledVehicleIds` (string[])
  - Méthodes : `loadSettings`, `setGlobalEnabled`, `setVehicleEnabled`, `isVehicleEnabled`
- `src/services/notifications.ts` :
  - Import du store de notification settings
  - Si `globalEnabled === false` → annulation de toutes les notifications, return
  - Si véhicule désactivé → skip
  - Logique "No-Alert" : skip si `wearPercent == null` ou `intervalKm == null && intervalMonths == null`
- `src/screens/MaintenanceScreen.tsx` : Switch global ON/OFF en haut de la liste
- `src/screens/VehicleMaintenanceScreen.tsx` : Switch par véhicule sous les boutons d'action
- `src/navigation/RootNavigator.tsx` : Chargement des notification settings au démarrage de l'app

---

## Récapitulatif des fichiers modifiés

### API (8 fichiers)
| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | +co2PerKm sur Vehicle |
| `vehicles/dto/create-vehicle.dto.ts` | +co2PerKm |
| `vehicles/dto/update-vehicle.dto.ts` | +co2PerKm |
| `maintenance/maintenance.service.ts` | DEFAULT_RULES PNEUS_AV/AR |
| `maintenance/dto/create-maintenance-rule.dto.ts` | PART_TYPES PNEUS_AV/AR |
| `maintenance/dto/create-maintenance-record.dto.ts` | PART_TYPES PNEUS_AV/AR |
| `stats/stats.service.ts` | +getCo2Stats() |
| `stats/stats.controller.ts` | +GET /stats/co2 |

### Mobile (10 modifiés, 2 nouveaux)
| Fichier | Modification |
|---------|-------------|
| `src/services/api.ts` | +co2PerKm, +getCo2Stats |
| `src/services/notifications.ts` | Toggles + labels pneus |
| `src/screens/VehiclesScreen.tsx` | +champ CO2 |
| `src/screens/DashboardScreen.tsx` | +carte CO2 |
| `src/screens/MaintenanceScreen.tsx` | +switch global + labels |
| `src/screens/VehicleMaintenanceScreen.tsx` | +switch véhicule + labels |
| `src/screens/MaintenanceRulesScreen.tsx` | Labels pneus |
| `src/screens/AddMaintenanceScreen.tsx` | Labels + picker pneus |
| `src/navigation/RootNavigator.tsx` | Tab Eco + init settings |
| **NOUVEAU** `src/screens/EcoScreen.tsx` | Dashboard CO2 |
| **NOUVEAU** `src/stores/notificationSettingsStore.ts` | Store toggles |
