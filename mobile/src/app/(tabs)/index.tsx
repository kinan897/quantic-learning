import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourse, useProgress } from '@/api/hooks';
import { LessonNode, type LessonStatus } from '@/components/learn/lesson-node';
import { UnitHeader } from '@/components/learn/unit-header';
import { StatPill } from '@/components/ui/stat-pill';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';

export default function LearnScreen() {
  const theme = useTheme();
  const courseId = usePreferences((s) => s.activeCourseId);
  const courseQuery = useCourse(courseId);
  const progressQuery = useProgress(courseId);
  const course = courseQuery.data;
  const progress = progressQuery.data;
  const lessonRecords = progress?.lessons ?? {};
  const error = courseQuery.error ?? progressQuery.error;

  let body;
  if (error) {
    body = (
      <ErrorState
        message={error.message}
        onRetry={() => {
          void courseQuery.refetch();
          void progressQuery.refetch();
        }}
      />
    );
  } else if (!course || !progress) {
    body = <LoadingState label="Loading your course…" />;
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
                {unit.lessons.map((lesson, i) => {
                  const newTopic = lesson.topic && lesson.topic !== unit.lessons[i - 1]?.topic;
                  return (
                    <Fragment key={lesson.id}>
                      {newTopic && <TopicHeader title={lesson.topic!} />}
                      <LessonNode
                        lesson={lesson}
                        status={statusOf(lesson.id)}
                        bestAccuracy={lessonRecords[lesson.id]?.best_accuracy}
                        isFirst={i === 0}
                        isLast={i === unit.lessons.length - 1}
                        onOpen={() =>
                          router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })
                        }
                      />
                    </Fragment>
                  );
                })}
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
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
          <Text variant="heading">Quantic</Text>
        </View>
        <View style={styles.stats}>
          <StatPill icon="flame" value={progress?.streak ?? '–'} tone="streak" label="day streak" />
          <StatPill icon="flash" value={progress?.total_xp ?? '–'} tone="xp" label="XP" />
        </View>
      </View>
      {body}
    </SafeAreaView>
  );
}

function TopicHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.topic}>
      <View style={[styles.topicLine, { backgroundColor: theme.border }]} />
      <Text variant="label" tone="secondary" style={styles.topicText}>
        {title}
      </Text>
      <View style={[styles.topicLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  topicLine: { flex: 1, height: 1 },
  topicText: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12 },
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
  logo: { width: 32, height: 32 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  courseIntro: { gap: Spacing.one, paddingTop: Spacing.two },
  eyebrow: { fontWeight: '800', letterSpacing: 1.2 },
  unit: { gap: Spacing.three },
  footer: { textAlign: 'center' },
});
