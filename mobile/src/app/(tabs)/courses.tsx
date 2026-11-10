/**
 * Course catalog, matching the website's "Subjects" section: filter pills, then a card per
 * course with its Ontario course code. Picking a course makes it the one on the Learn tab.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourses } from '@/api/hooks';
import type { CourseCategory, CourseSummary } from '@/api/types';
import { OrbitDecoration } from '@/components/ui/orbit';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, Glow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { usePreferences } from '@/store/preferences';

const FILTERS: { key: 'all' | CourseCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'junior', label: 'Grades 8–10' },
  { key: 'math', label: 'Mathematics' },
  { key: 'science', label: 'Sciences' },
  { key: 'english', label: 'English' },
  { key: 'uni', label: 'University' },
];

export default function CoursesScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data: courses, error, refetch } = useCourses();
  const activeCourseId = usePreferences((s) => s.activeCourseId);
  const setActiveCourse = usePreferences((s) => s.setActiveCourse);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  const twoColumns = width >= 640;
  const shown = (courses ?? []).filter((c) => filter === 'all' || c.category === filter);

  const choose = (course: CourseSummary) => {
    haptics.tap();
    setActiveCourse(course.id);
    router.navigate('/');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.header}>
            <OrbitDecoration size={200} opacity={0.4} style={styles.orbit} />
            <Text variant="eyebrow">Subjects</Text>
            <Text variant="display">
              Choose your <Text variant="display" tone="accent">course</Text>
            </Text>
            <Text tone="secondary">
              Grade 8 to first-year university, following the Ontario curriculum. Each card shows
              its course code.
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((f) => {
              const selected = f.key === filter;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filter,
                    {
                      borderColor: selected ? theme.accent : theme.border,
                      backgroundColor: selected ? theme.accent : 'transparent',
                    },
                  ]}>
                  <Text variant="label" style={[styles.filterText, { color: selected ? theme.onAccent : theme.text }]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : !courses ? (
            <LoadingState label="Loading courses…" />
          ) : (
            <View style={styles.grid}>
              {shown.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  active={course.id === activeCourseId}
                  style={twoColumns ? styles.half : styles.full}
                  onPress={() => choose(course)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({
  course,
  active,
  style,
  onPress,
}: {
  course: CourseSummary;
  active: boolean;
  style: object;
  onPress: () => void;
}) {
  const theme = useTheme();
  const dark = useIsDark();
  const soon = course.status === 'coming_soon';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: soon, selected: active }}
      accessibilityLabel={`${course.code} ${course.title}${soon ? ', coming soon' : ''}`}
      disabled={soon}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        styles.cardShell,
        {
          borderColor: active ? theme.accent : theme.border,
          boxShadow: active ? Glow.sky : undefined,
          opacity: soon ? 0.6 : 1,
          transform: [{ translateY: pressed ? -2 : 0 }],
        },
      ]}>
      <LinearGradient
        colors={dark ? ['rgba(13, 20, 48, 1)', 'rgba(11, 26, 74, 0.55)'] : [theme.surface, theme.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.code, { backgroundColor: theme.accentSoft }]}>
            <Text variant="caption" style={[styles.codeText, { color: theme.accent }]}>
              {course.code}
            </Text>
          </View>
          {active ? (
            <Badge icon="checkmark-circle" label="Current" color={theme.accent} />
          ) : soon ? (
            <Badge icon="time-outline" label="Coming soon" color={theme.textSecondary} />
          ) : (
            <Badge icon="layers-outline" label={`${course.lesson_count} lessons`} color={theme.textSecondary} />
          )}
        </View>
        <Text variant="heading" style={styles.title}>
          {course.title}
        </Text>
        <Text variant="caption" tone="secondary" style={styles.description}>
          {course.description}
        </Text>
        <View style={styles.grade}>
          <View style={styles.dot} />
          <Text variant="caption" style={{ color: theme.text }}>
            {course.grade_label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Badge({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={14} color={color} />
      <Text variant="caption" style={{ color, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth + 160, alignSelf: 'center', gap: Spacing.four },
  header: { gap: Spacing.two, paddingTop: Spacing.three },
  orbit: { right: -60, top: -50 },
  filters: { gap: Spacing.two, paddingRight: Spacing.three },
  filter: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two + 2,
  },
  filterText: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  full: { width: '100%' },
  half: { flexBasis: '47%', flexGrow: 1 },
  cardShell: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  card: { padding: Spacing.four, gap: Spacing.two, minHeight: 190 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { borderRadius: Radius.sm, paddingHorizontal: Spacing.two + 2, paddingVertical: 4 },
  codeText: { fontWeight: '700', letterSpacing: 1.6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { marginTop: Spacing.two, fontSize: 20 },
  description: { fontSize: 14, lineHeight: 20 },
  grade: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 'auto', paddingTop: Spacing.two },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.electric,
    boxShadow: '0px 0px 10px rgba(36, 71, 240, 0.9)',
  },
});
