/**
 * Quantic Learning design tokens: deep indigo with teal accents.
 * Every screen reads colours through `useTheme()` so light/dark mode follows the phone.
 */

import '@/global.css';

const light = {
  background: '#F6F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEFA',
  border: '#DFE1F0',
  text: '#16143D',
  textSecondary: '#5C5F7E',
  primary: '#4338CA',
  primaryPressed: '#3730A3',
  primarySoft: '#E0E4FF',
  onPrimary: '#FFFFFF',
  accent: '#0D9488',
  accentSoft: '#CDF5EF',
  success: '#0D9488',
  successSoft: '#D5F6F0',
  onSuccess: '#FFFFFF',
  error: '#E11D48',
  errorSoft: '#FFE4EA',
  onError: '#FFFFFF',
  xp: '#D97706',
  streak: '#EA580C',
  locked: '#B9BCD3',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: '#0C0B22',
  surface: '#17163B',
  surfaceAlt: '#221F4E',
  border: '#302D63',
  text: '#F2F2FF',
  textSecondary: '#A7A9CB',
  primary: '#8B93FA',
  primaryPressed: '#6E77F2',
  primarySoft: '#2A2862',
  onPrimary: '#0C0B22',
  accent: '#2DD4BF',
  accentSoft: '#12403D',
  success: '#2DD4BF',
  successSoft: '#123B39',
  onSuccess: '#06201D',
  error: '#FB7185',
  errorSoft: '#45152A',
  onError: '#2A0611',
  xp: '#FBBF24',
  streak: '#FB923C',
  locked: '#3D3A70',
};

export const Colors = { light, dark };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Content is centred and capped at this width on tablets and desktop web. */
export const MaxContentWidth = 640;
