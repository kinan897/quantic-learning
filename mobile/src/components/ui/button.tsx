import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glow, Radius, Spacing } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { Text } from './text';

/**
 * Pill buttons in the website's styles:
 * primary (electric blue, glowing) · sky · glass (translucent, outlined) · secondary · ghost.
 */
type Variant = 'primary' | 'sky' | 'glass' | 'secondary' | 'success' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: Props) {
  const theme = useTheme();
  const dark = useIsDark();
  const look: { bg: string; fg: string; border?: string; glow?: string } = {
    primary: { bg: theme.primary, fg: theme.onPrimary, glow: Glow.primary },
    sky: { bg: theme.accent, fg: theme.onAccent, glow: Glow.sky },
    glass: {
      bg: dark ? 'rgba(255, 255, 255, 0.06)' : theme.surface,
      fg: theme.text,
      border: dark ? 'rgba(255, 255, 255, 0.14)' : theme.border,
    },
    secondary: { bg: theme.surfaceAlt, fg: theme.text },
    success: { bg: theme.success, fg: theme.onSuccess },
    danger: { bg: theme.error, fg: theme.onError },
    ghost: { bg: 'transparent', fg: theme.accent },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: look.bg,
          borderColor: look.border ?? 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.88 : 1,
          boxShadow: look.glow && !disabled ? look.glow : undefined,
        },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={19} color={look.fg} />}
          <Text variant="label" style={{ color: look.fg }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
});
