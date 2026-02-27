import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification-settings';

interface NotificationSettings {
  globalEnabled: boolean;
  disabledVehicleIds: string[];
  disabledPartTypes: string[];
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setGlobalEnabled: (enabled: boolean) => Promise<void>;
  setVehicleEnabled: (vehicleId: string, enabled: boolean) => Promise<void>;
  isVehicleEnabled: (vehicleId: string) => boolean;
  setPartTypeEnabled: (vehicleId: string, partType: string, enabled: boolean) => Promise<void>;
  isPartTypeEnabled: (vehicleId: string, partType: string) => boolean;
}

const persist = (state: {
  globalEnabled: boolean;
  disabledVehicleIds: string[];
  disabledPartTypes: string[];
}) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));

export const useNotificationSettingsStore = create<NotificationSettings>((set, get) => ({
  globalEnabled: true,
  disabledVehicleIds: [],
  disabledPartTypes: [],
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          globalEnabled: parsed.globalEnabled ?? true,
          disabledVehicleIds: parsed.disabledVehicleIds ?? [],
          disabledPartTypes: parsed.disabledPartTypes ?? [],
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setGlobalEnabled: async (enabled) => {
    set({ globalEnabled: enabled });
    const s = get();
    await persist({ globalEnabled: enabled, disabledVehicleIds: s.disabledVehicleIds, disabledPartTypes: s.disabledPartTypes });
  },

  setVehicleEnabled: async (vehicleId, enabled) => {
    const current = get().disabledVehicleIds;
    const updated = enabled
      ? current.filter((id) => id !== vehicleId)
      : [...current, vehicleId];
    set({ disabledVehicleIds: updated });
    const s = get();
    await persist({ globalEnabled: s.globalEnabled, disabledVehicleIds: updated, disabledPartTypes: s.disabledPartTypes });
  },

  isVehicleEnabled: (vehicleId) => {
    return !get().disabledVehicleIds.includes(vehicleId);
  },

  setPartTypeEnabled: async (vehicleId, partType, enabled) => {
    const key = `${vehicleId}-${partType}`;
    const current = get().disabledPartTypes;
    const updated = enabled
      ? current.filter((k) => k !== key)
      : [...current, key];
    set({ disabledPartTypes: updated });
    const s = get();
    await persist({ globalEnabled: s.globalEnabled, disabledVehicleIds: s.disabledVehicleIds, disabledPartTypes: updated });
  },

  isPartTypeEnabled: (vehicleId, partType) => {
    const key = `${vehicleId}-${partType}`;
    return !get().disabledPartTypes.includes(key);
  },
}));
