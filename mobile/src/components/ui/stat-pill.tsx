import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  tone: 'xp' | 'streak' | 'accent';
  label: string; // for screen readers
};

export function StatPill({ icon, value, tone, label }: Props) {
  const theme = useTheme();
  const color = theme[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text variant="label" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
