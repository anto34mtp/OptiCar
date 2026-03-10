import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, type ThemeName, type ThemeColors } from '../theme';

const THEME_KEY = '@opticar_theme';

type ThemeStore = {
  themeName: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => Promise<void>;
  loadTheme: () => Promise<void>;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  themeName: 'sombre',
  colors: themes['sombre'],

  setTheme: async (name: ThemeName) => {
    await AsyncStorage.setItem(THEME_KEY, name);
    set({ themeName: name, colors: themes[name] });
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved && themes[saved as ThemeName]) {
        set({ themeName: saved as ThemeName, colors: themes[saved as ThemeName] });
      }
    } catch {}
  },
}));
