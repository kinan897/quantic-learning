import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { Unit } from '@/api/types';
import { OrbitDecoration } from '@/components/ui/orbit';
import { Text } from '@/components/ui/text';
import { Brand, Glow, Radius, Spacing } from '@/constants/theme';

type Props = { unit: Unit; index: number; completedCount: number };

/** Unit banner: the website's electric-blue → navy gradient with orbit rings. */
export function UnitHeader({ unit, index, completedCount }: Props) {
  const total = unit.lessons.length;
  return (
    <View style={styles.shadow}>
      <LinearGradient
        colors={[Brand.electric, Brand.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <OrbitDecoration size={190} opacity={0.4} style={styles.orbit} />
        <View style={styles.row}>
          <Text variant="eyebrow" style={styles.eyebrow}>
            Unit {index + 1}
          </Text>
          <View style={styles.count}>
            <Text variant="caption" style={styles.countText}>
              {completedCount}/{total} lessons
            </Text>
          </View>
        </View>
        <Text variant="title" style={styles.white}>
          {unit.title}
        </Text>
        {unit.description ? <Text style={styles.description}>{unit.description}</Text> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: Radius.lg, boxShadow: Glow.primary },
  card: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two, overflow: 'hidden' },
  orbit: { right: -50, top: -40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#CFE6FF' },
  count: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
  },
  countText: { color: Brand.white, fontWeight: '700' },
  white: { color: Brand.white },
  description: { color: '#D5DDF2' },
});
