import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification-settings';

interface NotificationSettings {
  globalEnabled: boolean;
  disabledVehicleIds: string[];
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setGlobalEnabled: (enabled: boolean) => Promise<void>;
  setVehicleEnabled: (vehicleId: string, enabled: boolean) => Promise<void>;
  isVehicleEnabled: (vehicleId: string) => boolean;
}

const persist = (state: { globalEnabled: boolean; disabledVehicleIds: string[] }) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));

export const useNotificationSettingsStore = create<NotificationSettings>((set, get) => ({
  globalEnabled: true,
  disabledVehicleIds: [],
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          globalEnabled: parsed.globalEnabled ?? true,
          disabledVehicleIds: parsed.disabledVehicleIds ?? [],
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
    await persist({ globalEnabled: enabled, disabledVehicleIds: get().disabledVehicleIds });
  },

  setVehicleEnabled: async (vehicleId, enabled) => {
    const current = get().disabledVehicleIds;
    const updated = enabled
      ? current.filter((id) => id !== vehicleId)
      : [...current, vehicleId];
    set({ disabledVehicleIds: updated });
    await persist({ globalEnabled: get().globalEnabled, disabledVehicleIds: updated });
  },

  isVehicleEnabled: (vehicleId) => {
    return !get().disabledVehicleIds.includes(vehicleId);
  },
}));
