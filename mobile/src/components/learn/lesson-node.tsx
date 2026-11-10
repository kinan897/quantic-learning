import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { LessonSummary } from '@/api/types';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LessonStatus = 'completed' | 'current' | 'locked';

type Props = {
  lesson: LessonSummary;
  status: LessonStatus;
  bestAccuracy?: number;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
};

const NODE = 48;

export const LESSON_KINDS = {
  learn: { label: 'LEARN', icon: 'book', start: 'Start learning' },
  practice: { label: 'PRACTICE', icon: 'barbell', start: 'Start practice' },
  destroyer: { label: 'DESTROYER', icon: 'skull', start: 'Face the Destroyer' },
} as const;

/** One stop on the course timeline: a node on the rail plus a lesson card. */
export function LessonNode({ lesson, status, bestAccuracy, isFirst, isLast, onOpen }: Props) {
  const theme = useTheme();
  const locked = status === 'locked';
  const kind = LESSON_KINDS[lesson.kind];
  const isDestroyer = lesson.kind === 'destroyer';
  const kindColor = isDestroyer ? theme.destroyer : theme.primary;
  const railColor = (done: boolean) => (done ? theme.accent : theme.border);

  const node = {
    completed: { bg: theme.accent, fg: theme.onPrimary, icon: 'checkmark' as const },
    current: { bg: kindColor, fg: theme.onPrimary, icon: kind.icon },
    locked: { bg: theme.surfaceAlt, fg: theme.locked, icon: 'lock-closed' as const },
  }[status];

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View
          style={[styles.segment, { backgroundColor: railColor(status !== 'locked') }, isFirst && styles.hidden]}
        />
        <View style={styles.nodeWrap}>
          {status === 'current' && <PulseRing color={kindColor} />}
          <View style={[styles.node, { backgroundColor: node.bg }]}>
            <Ionicons name={node.icon} size={22} color={node.fg} />
          </View>
        </View>
        <View
          style={[styles.segment, { backgroundColor: railColor(status === 'completed') }, isLast && styles.hidden]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
        accessibilityLabel={`${lesson.title}, ${locked ? 'locked' : status}`}
        disabled={locked}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: status === 'current' ? kindColor : isDestroyer ? theme.destroyerSoft : theme.border,
            borderWidth: status === 'current' ? 2 : 1,
            opacity: locked ? 0.55 : pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.kindRow}>
          <Ionicons name={kind.icon} size={13} color={kindColor} />
          <Text variant="caption" style={[styles.kindLabel, { color: kindColor }]}>
            {kind.label}
          </Text>
        </View>
        <Text variant="heading">{lesson.title.replace(/^(Learn|Practice|Destroyer): /, '')}</Text>
        <Text variant="caption" tone="secondary">
          {lesson.description}
        </Text>
        <View style={styles.meta}>
          {lesson.card_count > 0 && <Meta icon="albums-outline" label={`${lesson.card_count} cards`} />}
          <Meta
            icon="help-circle-outline"
            label={`${lesson.question_count} ${lesson.kind === 'learn' ? 'checks' : 'questions'}`}
          />
          <Meta icon="flash" label={`${lesson.xp} XP`} tone="xp" />
          {status === 'completed' && bestAccuracy !== undefined && (
            <Meta icon="ribbon-outline" label={`Best ${Math.round(bestAccuracy * 100)}%`} tone="accent" />
          )}
        </View>
        {status === 'current' && (
          // Looks like a button, but the whole card is the tap target (no nested buttons).
          <View style={[styles.start, { backgroundColor: kindColor }]}>
            <Ionicons name={isDestroyer ? 'skull' : 'arrow-forward'} size={18} color={theme.onPrimary} />
            <Text variant="label" style={{ color: theme.onPrimary }}>
              {kind.start}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function Meta({
  icon,
  label,
  tone = 'secondary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'secondary' | 'xp' | 'accent';
}) {
  const theme = useTheme();
  const color = tone === 'secondary' ? theme.textSecondary : theme[tone];
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={color} />
      <Text variant="caption" style={{ color, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function PulseRing({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.45 }],
  }));
  return <Animated.View style={[styles.node, styles.ring, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'stretch' },
  rail: { width: NODE, alignItems: 'center' },
  segment: { width: 4, flex: 1, minHeight: Spacing.three, borderRadius: 2 },
  hidden: { opacity: 0 },
  nodeWrap: { width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute' },
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
    marginVertical: Spacing.two,
  },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  kindLabel: { fontWeight: '800', letterSpacing: 1.1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.one },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  start: {
    marginTop: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
