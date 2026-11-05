import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyBold' | 'caption' | 'label';
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

export type AppTextProps = TextProps & { variant?: Variant; tone?: Tone };

export function Text({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return <RNText style={[styles[variant], { color: theme[toneColor[tone]] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
  bodyBold: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: 0.3 },
});
