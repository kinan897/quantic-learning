import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourse } from '@/api/hooks';
import { LessonNode, type LessonStatus } from '@/components/learn/lesson-node';
import { UnitHeader } from '@/components/learn/unit-header';
import { StatPill } from '@/components/ui/stat-pill';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentStreak, useProgress } from '@/store/progress';

export default function LearnScreen() {
  const theme = useTheme();
  const courseId = useProgress((s) => s.activeCourseId);
  const lessonRecords = useProgress((s) => s.lessons);
  const totalXp = useProgress((s) => s.totalXp);
  const streak = useCurrentStreak();
  const { data: course, isPending, error, refetch } = useCourse(courseId);

  let body;
  if (isPending) {
    body = <LoadingState label="Loading your course…" />;
  } else if (error) {
    body = <ErrorState message={error.message} onRetry={() => void refetch()} />;
  } else {
    // Lessons unlock in order: everything up to the first unfinished lesson is open.
    const ordered = course.units.flatMap((u) => u.lessons);
    const currentId = ordered.find((l) => !lessonRecords[l.id])?.id;
    const statusOf = (id: string): LessonStatus =>
      lessonRecords[id] ? 'completed' : id === currentId ? 'current' : 'locked';

    body = (
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.courseIntro}>
            <Text variant="caption" tone="primary" style={styles.eyebrow}>
              {course.code}
              {course.grade ? ` · GRADE ${course.grade}` : ''}
            </Text>
            <Text variant="display">{course.title}</Text>
          </View>

          {course.units.map((unit, unitIndex) => (
            <View key={unit.id} style={styles.unit}>
              <UnitHeader
                unit={unit}
                index={unitIndex}
                completedCount={unit.lessons.filter((l) => lessonRecords[l.id]).length}
              />
              <View>
                {unit.lessons.map((lesson, i) => (
                  <LessonNode
                    key={lesson.id}
                    lesson={lesson}
                    status={statusOf(lesson.id)}
                    bestAccuracy={lessonRecords[lesson.id]?.bestAccuracy}
                    isFirst={i === 0}
                    isLast={i === unit.lessons.length - 1}
                    onOpen={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                  />
                ))}
              </View>
            </View>
          ))}

          <Text tone="secondary" variant="caption" style={styles.footer}>
            More units are on the way.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Text variant="label" style={{ color: theme.onPrimary }}>
              Q
            </Text>
          </View>
          <Text variant="heading">Quantic</Text>
        </View>
        <View style={styles.stats}>
          <StatPill icon="flame" value={streak} tone="streak" label="day streak" />
          <StatPill icon="flash" value={totalXp} tone="xp" label="XP" />
        </View>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logo: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.two },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  courseIntro: { gap: Spacing.one, paddingTop: Spacing.two },
  eyebrow: { fontWeight: '800', letterSpacing: 1.2 },
  unit: { gap: Spacing.three },
  footer: { textAlign: 'center' },
});
