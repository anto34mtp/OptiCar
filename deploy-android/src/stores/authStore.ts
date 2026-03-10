import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocalMode: boolean;
  hasChosenMode: boolean;
  localUserName: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setLocalMode: (val: boolean) => Promise<void>;
  setHasChosenMode: (val: boolean) => Promise<void>;
  clearLocalMode: () => Promise<void>;
  setLocalUserName: (name: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  isLocalMode: false,
  hasChosenMode: false,
  localUserName: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    await AsyncStorage.removeItem('app-mode');
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLocalMode: false,
      hasChosenMode: true,
      localUserName: null,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    await AsyncStorage.removeItem('app-mode');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLocalMode: false,
      hasChosenMode: false,
      localUserName: null,
    });
  },

  loadAuth: async () => {
    try {
      const [accessToken, refreshToken, userStr, modeStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('user'),
        AsyncStorage.getItem('app-mode'),
      ]);

      const { isLocalMode = false, hasChosenMode = false, localUserName = null } = modeStr ? JSON.parse(modeStr) : {};

      if (accessToken && refreshToken && userStr) {
        const user = JSON.parse(userStr);
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false, isLocalMode: false, hasChosenMode: true });
      } else {
        set({ isLoading: false, isLocalMode, hasChosenMode, localUserName });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setLocalMode: async (val) => {
    const modeStr = await AsyncStorage.getItem('app-mode');
    const current = modeStr ? JSON.parse(modeStr) : {};
    await AsyncStorage.setItem('app-mode', JSON.stringify({ ...current, isLocalMode: val, hasChosenMode: true }));
    set({ isLocalMode: val, hasChosenMode: true });
  },

  setLocalUserName: async (name) => {
    const modeStr = await AsyncStorage.getItem('app-mode');
    const current = modeStr ? JSON.parse(modeStr) : {};
    await AsyncStorage.setItem('app-mode', JSON.stringify({ ...current, localUserName: name }));
    set({ localUserName: name });
  },

  setHasChosenMode: async (val) => {
    const modeStr = await AsyncStorage.getItem('app-mode');
    const current = modeStr ? JSON.parse(modeStr) : {};
    await AsyncStorage.setItem('app-mode', JSON.stringify({ ...current, hasChosenMode: val }));
    set({ hasChosenMode: val });
  },

  clearLocalMode: async () => {
    await AsyncStorage.removeItem('app-mode');
    set({ isLocalMode: false, hasChosenMode: false });
  },
}));
