/**
 * Quantic Learning design tokens, matching the Quantic website's "orbit" design:
 *   page #060A1A · cards #0D1430 · navy #0B1A4A (the Q) · sky #4FADE8 (orbits)
 *   electric #2447F0 (electrons) · text #EEF3FF · muted #9BA8C9
 *   Sora for headings, Manrope for everything else.
 *
 * Dark is the default, like the website. Students can switch to light or "match my phone"
 * on the Profile tab. Every screen reads colours through `useTheme()`.
 */

import '@/global.css';

export const Brand = {
  page: '#060A1A',
  card: '#0D1430',
  navy: '#0B1A4A',
  sky: '#4FADE8',
  electric: '#2447F0',
  text: '#EEF3FF',
  muted: '#9BA8C9',
  amber: '#FFB547',
  white: '#FFFFFF',
} as const;

const dark = {
  background: Brand.page,
  surface: Brand.card,
  surfaceAlt: '#141E44',
  border: 'rgba(79, 173, 232, 0.18)',
  text: Brand.text,
  textSecondary: Brand.muted,
  primary: Brand.electric,
  primaryPressed: '#1C3BD6',
  primarySoft: 'rgba(36, 71, 240, 0.18)',
  onPrimary: Brand.white,
  accent: Brand.sky,
  accentSoft: 'rgba(79, 173, 232, 0.12)',
  onAccent: Brand.navy,
  success: '#5BE39A',
  successSoft: 'rgba(46, 204, 113, 0.12)',
  onSuccess: '#05230F',
  error: '#FF7A8A',
  errorSoft: 'rgba(255, 122, 138, 0.12)',
  onError: '#2A0611',
  xp: Brand.sky,
  streak: Brand.amber,
  locked: '#2A3560',
  destroyer: '#FF5A6E',
  destroyerSoft: 'rgba(255, 90, 110, 0.12)',
  graphMain: '#CFE6FF',
  graphAccent: Brand.sky,
};

export type ThemeColors = Record<keyof typeof dark, string>;

const light: ThemeColors = {
  background: '#F4F7FC',
  surface: Brand.white,
  surfaceAlt: '#EAF0FB',
  border: '#D8E1F0',
  text: Brand.navy,
  textSecondary: '#4A5878',
  primary: Brand.electric,
  primaryPressed: '#1C3BD6',
  primarySoft: '#E2E8FE',
  onPrimary: Brand.white,
  accent: '#1F8FD6',
  accentSoft: '#E1F1FC',
  onAccent: Brand.white,
  success: '#12A150',
  successSoft: '#DDF5E6',
  onSuccess: Brand.white,
  error: '#D92D47',
  errorSoft: '#FDE6EA',
  onError: Brand.white,
  xp: '#1F8FD6',
  streak: '#D97F00',
  locked: '#B4BED3',
  destroyer: '#C81E1E',
  destroyerSoft: '#FDE4E4',
  graphMain: Brand.navy,
  graphAccent: Brand.electric,
};

export const Colors = { light, dark };

/** Font families loaded in app/_layout.tsx (names come from @expo-google-fonts). */
export const Fonts = {
  display: 'Sora_800ExtraBold',
  heading: 'Sora_700Bold',
  headingSemi: 'Sora_600SemiBold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
} as const;

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

/** The website's glowing primary button. */
export const Glow = {
  primary: '0px 8px 30px rgba(36, 71, 240, 0.35)',
  sky: '0px 6px 24px rgba(79, 173, 232, 0.28)',
} as const;

/** Content is centred and capped at this width on tablets and desktop web. */
export const MaxContentWidth = 640;
