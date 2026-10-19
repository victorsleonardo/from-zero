export const Colors = {
  light: {
    text: '#0F1115',
    textSecondary: '#5F6673',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#ECEEF2',
    border: '#DEE1E7',
    primary: '#4F46E5',
    onPrimary: '#FFFFFF',
    success: '#15803D',
    danger: '#C2410C',
  },
  dark: {
    text: '#ECEEF2',
    textSecondary: '#9AA3B0',
    background: '#0B0D11',
    surface: '#151820',
    surfaceAlt: '#1E222B',
    border: '#2A303B',
    primary: '#818CF8',
    onPrimary: '#0B0D11',
    success: '#4ADE80',
    danger: '#FB923C',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
