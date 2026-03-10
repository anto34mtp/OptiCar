import { StyleSheet } from 'react-native';

export type ThemeName = 'clair' | 'sombre' | 'futuriste' | 'moderne' | 'ocean';

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMid: string;
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  danger: string;
  dangerLight: string;
  purple: string;
  purpleLight: string;
  background: string;
  card: string;
  cardBorder: string;
  dark: string;
  darkMid: string;
  text: string;
  textMid: string;
  textLight: string;
  border: string;
  borderLight: string;
  headerBg: string;
  headerText: string;
  headerSubText: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  statusBar: 'light-content' | 'dark-content';
  inputBg: string;
  inputBorder: string;
  switchTrack: string;
};

export type ThemeMeta = {
  name: ThemeName;
  label: string;
  emoji: string;
  preview: { bg: string; accent: string; card: string };
};

export const THEME_META: ThemeMeta[] = [
  { name: 'clair',      label: 'Clair',      emoji: '☀️',  preview: { bg: '#f1f5f9', accent: '#2563eb', card: '#ffffff' } },
  { name: 'sombre',     label: 'Sombre',     emoji: '🌙',  preview: { bg: '#0f172a', accent: '#3b82f6', card: '#1e293b' } },
  { name: 'futuriste',  label: 'Futuriste',  emoji: '🤖',  preview: { bg: '#050a0e', accent: '#06b6d4', card: '#0d1b2a' } },
  { name: 'moderne',    label: 'Moderne',    emoji: '💎',  preview: { bg: '#fafafa', accent: '#6366f1', card: '#ffffff' } },
  { name: 'ocean',      label: 'Océan',      emoji: '🌊',  preview: { bg: '#0c1a2e', accent: '#0ea5e9', card: '#142238' } },
];

const shared = {
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#059669',
  warning: '#f97316',
  warningLight: '#ffedd5',
  warningDark: '#ea580c',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
};

export const themes: Record<ThemeName, ThemeColors> = {
  clair: {
    ...shared,
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: '#eff6ff',
    primaryMid: '#dbeafe',
    purple: '#8b5cf6',
    purpleLight: '#ede9fe',
    background: '#f1f5f9',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    dark: '#1e293b',
    darkMid: '#334155',
    text: '#0f172a',
    textMid: '#475569',
    textLight: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f8fafc',
    headerBg: '#1e293b',
    headerText: '#ffffff',
    headerSubText: 'rgba(255,255,255,0.55)',
    tabBar: '#ffffff',
    tabBarActive: '#2563eb',
    tabBarInactive: '#94a3b8',
    statusBar: 'light-content',
    inputBg: '#f8fafc',
    inputBorder: '#e2e8f0',
    switchTrack: '#dbeafe',
  },
  sombre: {
    ...shared,
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    primaryLight: '#1e3a5f',
    primaryMid: '#1e3a5f',
    purple: '#a78bfa',
    purpleLight: '#2d1f5e',
    background: '#0f172a',
    card: '#1e293b',
    cardBorder: '#334155',
    dark: '#0f172a',
    darkMid: '#1e293b',
    text: '#f1f5f9',
    textMid: '#94a3b8',
    textLight: '#64748b',
    border: '#334155',
    borderLight: '#1e293b',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    headerSubText: 'rgba(255,255,255,0.45)',
    tabBar: '#0f172a',
    tabBarActive: '#3b82f6',
    tabBarInactive: '#64748b',
    statusBar: 'light-content',
    inputBg: '#0f172a',
    inputBorder: '#334155',
    switchTrack: '#1e3a5f',
  },
  futuriste: {
    ...shared,
    success: '#00e5b0',
    successLight: '#002a22',
    successDark: '#00c49a',
    warning: '#f59e0b',
    warningLight: '#1c1200',
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    primaryLight: '#083344',
    primaryMid: '#0e4a5c',
    purple: '#c084fc',
    purpleLight: '#2d1b4e',
    background: '#050a0e',
    card: '#0d1b2a',
    cardBorder: '#0e3a4a',
    dark: '#050a0e',
    darkMid: '#0d1b2a',
    text: '#e2f8ff',
    textMid: '#7ecde0',
    textLight: '#2a6070',
    border: '#0e3a4a',
    borderLight: '#071520',
    headerBg: '#050a0e',
    headerText: '#e2f8ff',
    headerSubText: 'rgba(126,205,224,0.55)',
    tabBar: '#050a0e',
    tabBarActive: '#06b6d4',
    tabBarInactive: '#2a6070',
    statusBar: 'light-content',
    inputBg: '#071520',
    inputBorder: '#0e3a4a',
    switchTrack: '#0e4a5c',
  },
  moderne: {
    ...shared,
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#eef2ff',
    primaryMid: '#e0e7ff',
    purple: '#8b5cf6',
    purpleLight: '#ede9fe',
    background: '#fafafa',
    card: '#ffffff',
    cardBorder: '#e5e7eb',
    dark: '#4f46e5',
    darkMid: '#6366f1',
    text: '#111827',
    textMid: '#6b7280',
    textLight: '#9ca3af',
    border: '#e5e7eb',
    borderLight: '#f9fafb',
    headerBg: '#4f46e5',
    headerText: '#ffffff',
    headerSubText: 'rgba(255,255,255,0.65)',
    tabBar: '#4f46e5',
    tabBarActive: '#ffffff',
    tabBarInactive: 'rgba(255,255,255,0.5)',
    statusBar: 'light-content',
    inputBg: '#f3f4f6',
    inputBorder: '#e5e7eb',
    switchTrack: '#e0e7ff',
  },
  ocean: {
    ...shared,
    primary: '#0ea5e9',
    primaryDark: '#0284c7',
    primaryLight: '#0c2a3d',
    primaryMid: '#0c2a3d',
    purple: '#818cf8',
    purpleLight: '#1e1b4b',
    background: '#0c1a2e',
    card: '#142238',
    cardBorder: '#1e3a5f',
    dark: '#071828',
    darkMid: '#0c1a2e',
    text: '#e0f2fe',
    textMid: '#7dd3fc',
    textLight: '#2563a0',
    border: '#1e3a5f',
    borderLight: '#0c1a2e',
    headerBg: '#071828',
    headerText: '#e0f2fe',
    headerSubText: 'rgba(125,211,252,0.55)',
    tabBar: '#071828',
    tabBarActive: '#0ea5e9',
    tabBarInactive: '#2563a0',
    statusBar: 'light-content',
    inputBg: '#0c1a2e',
    inputBorder: '#1e3a5f',
    switchTrack: '#0c2a3d',
  },
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const fuelColors: Record<string, { bg: string; text: string; border: string }> = {
  SP95:     { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  SP98:     { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  E10:      { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  E85:      { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  DIESEL:   { bg: '#fefce8', text: '#92400e', border: '#fef08a' },
  ELECTRIC: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
};
