import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

import { Fonts, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label'
  | 'eyebrow';
type Tone = 'default' | 'secondary' | 'primary' | 'accent' | 'success' | 'error' | 'xp' | 'streak';

const toneColor: Record<Tone, keyof ThemeColors> = {
  default: 'text',
  secondary: 'textSecondary',
  primary: 'primary',
  accent: 'accent',
  success: 'success',
  error: 'error',
  xp: 'xp',
  streak: 'streak',
};

// Headings use Sora (like the website); everything else uses Manrope.
const SORA_VARIANTS = new Set<Variant>(['display', 'title', 'heading']);

export type AppTextProps = TextProps & { variant?: Variant; tone?: Tone };

export function Text({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const defaultColor = variant === 'eyebrow' && tone === 'default' ? theme.accent : theme[toneColor[tone]];
  // Custom fonts ship one file per weight, so a `fontWeight` in a style is turned into the
  // matching font file (Android ignores fontWeight for custom fonts).
  const { fontWeight, ...flat } = StyleSheet.flatten([styles[variant], { color: defaultColor }, style]) as TextStyle;
  const fontFamily = flat.fontFamily ?? familyFor(SORA_VARIANTS.has(variant), fontWeight);
  return <RNText style={{ ...flat, fontFamily }} {...rest} />;
}

function familyFor(sora: boolean, weight: TextStyle['fontWeight']): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || !weight ? 0 : weight);
  if (sora) return w >= 800 ? Fonts.display : w === 600 ? Fonts.headingSemi : Fonts.heading;
  if (w >= 800) return Fonts.bodyHeavy;
  if (w >= 700) return Fonts.bodyBold;
  if (w >= 600) return Fonts.bodySemi;
  return Fonts.body;
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24 },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
