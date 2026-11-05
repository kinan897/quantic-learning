import { StyleSheet, View } from 'react-native';

import type { Unit } from '@/api/types';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { unit: Unit; index: number; completedCount: number };

export function UnitHeader({ unit, index, completedCount }: Props) {
  const theme = useTheme();
  const total = unit.lessons.length;
  return (
    <View style={[styles.card, { backgroundColor: theme.primary }]}>
      <View style={styles.row}>
        <Text variant="caption" style={[styles.eyebrow, { color: theme.onPrimary }]}>
          UNIT {index + 1}
        </Text>
        <Text variant="caption" style={{ color: theme.onPrimary, opacity: 0.85 }}>
          {completedCount}/{total} lessons
        </Text>
      </View>
      <Text variant="title" style={{ color: theme.onPrimary }}>
        {unit.title}
      </Text>
      {unit.description ? (
        <Text style={{ color: theme.onPrimary, opacity: 0.85 }}>{unit.description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontWeight: '800', letterSpacing: 1.2, opacity: 0.85 },
});
