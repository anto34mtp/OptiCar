import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vehiclesService, maintenanceService } from './api';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';

const PART_TYPE_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  FILTRE_AIR: 'Filtre à air',
  FILTRE_CARBURANT: 'Filtre carburant',
  BOUGIES: 'Bougies',
  FILTRE_HABITACLE: 'Filtre habitacle',
  KIT_DISTRIBUTION: 'Kit distribution',
  POMPE_EAU: 'Pompe à eau',
  COURROIE_ACCESSOIRES: 'Courroie accessoires',
  LIQUIDE_REFROIDISSEMENT: 'Liquide refroidissement',
  PLAQUETTES_AV: 'Plaquettes avant',
  PLAQUETTES_AR: 'Plaquettes arrière',
  DISQUES_AV: 'Disques avant',
  DISQUES_AR: 'Disques arrière',
  LIQUIDE_FREIN: 'Liquide de frein',
  PNEUS_AV: 'Pneus avant',
  PNEUS_AR: 'Pneus arrière',
  BATTERIE: 'Batterie',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
};

function partLabel(partType: string): string {
  return PART_TYPE_LABELS[partType] || partType;
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkAndScheduleNotifications(): Promise<void> {
  const settings = useNotificationSettingsStore.getState();
  if (!settings.isLoaded) await settings.loadSettings();

  // Global toggle check
  if (!settings.globalEnabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const granted = await requestPermissions();
  if (!granted) return;

  let vehicles: any[];
  try {
    vehicles = await vehiclesService.getAll();
  } catch {
    return;
  }

  for (const vehicle of vehicles) {
    // Per-vehicle toggle check
    if (!useNotificationSettingsStore.getState().isVehicleEnabled(vehicle.id)) {
      continue;
    }
    let statuses: any[];
    try {
      statuses = await maintenanceService.getStatus(vehicle.id);
    } catch {
      continue;
    }

    const vehicleName = `${vehicle.brand} ${vehicle.model}`;

    for (const s of statuses) {
      // Per-partType toggle check
      if (!useNotificationSettingsStore.getState().isPartTypeEnabled(vehicle.id, s.partType)) {
        continue;
      }

      // No-Alert logic: skip if no interval defined or no wear data
      if (s.intervalKm == null && s.intervalMonths == null) continue;
      if (s.wearPercent == null) continue;

      const wear = s.wearPercent;
      const partType: string = s.partType;
      const idBase = `${vehicle.id}-${partType}`;

      if (wear >= 100) {
        // Cancel any one-shot flags since we're now in daily mode
        await clearFlag(`notified-${idBase}-90`);
        await clearFlag(`notified-${idBase}-95`);

        // Schedule daily recurring notification (idempotent via identifier)
        await Notifications.cancelScheduledNotificationAsync(`${idBase}-daily`).catch(() => {});
        await Notifications.scheduleNotificationAsync({
          identifier: `${idBase}-daily`,
          content: {
            title: `${vehicleName} — Entretien dépassé`,
            body: `${partLabel(partType)} : usure à ${Math.round(wear)}%. Entretien requis !`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
          },
        });
      } else if (wear >= 95) {
        // Cancel daily if it was set before
        await Notifications.cancelScheduledNotificationAsync(`${idBase}-daily`).catch(() => {});

        await clearFlag(`notified-${idBase}-90`);
        const flag95 = `notified-${idBase}-95`;
        if (!(await hasFlag(flag95))) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${vehicleName} — Entretien imminent`,
              body: `${partLabel(partType)} : usure à ${Math.round(wear)}%. Planifiez votre entretien.`,
            },
            trigger: null,
          });
          await setFlag(flag95);
        }
      } else if (wear >= 90) {
        await Notifications.cancelScheduledNotificationAsync(`${idBase}-daily`).catch(() => {});

        const flag90 = `notified-${idBase}-90`;
        if (!(await hasFlag(flag90))) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${vehicleName} — Entretien à prévoir`,
              body: `${partLabel(partType)} : usure à ${Math.round(wear)}%. Pensez à planifier l'entretien.`,
            },
            trigger: null,
          });
          await setFlag(flag90);
        }
      } else {
        // Wear < 90%: maintenance was done, clean up everything
        await Notifications.cancelScheduledNotificationAsync(`${idBase}-daily`).catch(() => {});
        await clearFlag(`notified-${idBase}-90`);
        await clearFlag(`notified-${idBase}-95`);
      }
    }
  }
}

async function hasFlag(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) === '1';
}

async function setFlag(key: string): Promise<void> {
  await AsyncStorage.setItem(key, '1');
}

async function clearFlag(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
