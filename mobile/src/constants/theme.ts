/**
 * Quantic Learning design tokens, taken from the company logo:
 *   navy  #06184C (the Q) · electron blue #1A42EF · orbit sky blue #54AFF5 · white
 *
 * Light mode is white with navy; dark mode is deep navy with white. Every screen reads colours
 * through `useTheme()`, so light/dark follows the phone.
 */

import '@/global.css';

export const Brand = {
  navy: '#06184C',
  electron: '#1A42EF',
  orbit: '#54AFF5',
  white: '#FFFFFF',
} as const;

const light = {
  background: '#F4F7FC',
  surface: '#FFFFFF',
  surfaceAlt: '#E9EEF8',
  border: '#DCE3F0',
  text: Brand.navy,
  textSecondary: '#4A5878',
  primary: Brand.navy,
  primaryPressed: '#0E2A6E',
  primarySoft: '#E3E9F7',
  onPrimary: Brand.white,
  accent: Brand.electron,
  accentSoft: '#E1E8FE',
  success: '#12A150',
  successSoft: '#DDF5E6',
  onSuccess: Brand.white,
  error: '#D92D47',
  errorSoft: '#FDE6EA',
  onError: Brand.white,
  xp: '#D97706',
  streak: '#EA580C',
  locked: '#B4BED3',
  destroyer: '#C81E1E',
  destroyerSoft: '#FDE4E4',
};

export type ThemeColors = Record<keyof typeof light, string>;

const dark: ThemeColors = {
  background: '#040E2B',
  surface: '#0A1A45',
  surfaceAlt: '#112456',
  border: '#1D3268',
  text: '#F4F7FF',
  textSecondary: '#9FB0D6',
  primary: Brand.white,
  primaryPressed: '#DCE3F0',
  primarySoft: '#16295E',
  onPrimary: Brand.navy,
  accent: Brand.orbit,
  accentSoft: '#0F2F5A',
  success: '#34D399',
  successSoft: '#0C3A2E',
  onSuccess: '#04241A',
  error: '#FB7185',
  errorSoft: '#47152A',
  onError: '#2A0611',
  xp: '#FBBF24',
  streak: '#FB923C',
  locked: '#2A3B6B',
  destroyer: '#F87171',
  destroyerSoft: '#3F1219',
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
