import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourse, useProgress } from '@/api/hooks';
import { LessonNode, type LessonStatus } from '@/components/learn/lesson-node';
import { UnitHeader } from '@/components/learn/unit-header';
import { Button } from '@/components/ui/button';
import { OrbitDecoration } from '@/components/ui/orbit';
import { StatPill } from '@/components/ui/stat-pill';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
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
            <OrbitDecoration size={220} opacity={0.45} style={styles.orbit} />
            <Text variant="eyebrow">
              {course.code} · {course.grade_label}
            </Text>
            <Text variant="display">{course.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch course"
              onPress={() => router.navigate('/courses')}
              style={({ pressed }) => [
                styles.switch,
                { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
              ]}>
              <Ionicons name="swap-horizontal" size={16} color={theme.accent} />
              <Text variant="label" tone="accent" style={styles.switchText}>
                Switch course
              </Text>
            </Pressable>
          </View>

          {course.status === 'coming_soon' ? (
            <View style={[styles.soon, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="planet-outline" size={40} color={theme.accent} />
              <Text variant="heading">Lessons are on the way</Text>
              <Text tone="secondary" style={styles.center}>
                {course.description} This course is being written now, in the same Learn,
                Practice and Destroyer format.
              </Text>
              <Button title="Browse courses" variant="glass" icon="library-outline" onPress={() => router.navigate('/courses')} />
            </View>
          ) : (
            course.units.map((unit, unitIndex) => (
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
            ))
          )}

          {course.status === 'available' && (
            <Text tone="secondary" variant="caption" style={styles.center}>
              More units are on the way.
            </Text>
          )}
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
          <Text variant="heading" style={styles.brandText}>
            Quantic
          </Text>
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
      <Text variant="eyebrow" style={styles.topicText}>
        {title}
      </Text>
      <View style={[styles.topicLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  brandText: { fontSize: 20 },
  logo: { width: 36, height: 36 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  courseIntro: { gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  orbit: { right: -60, top: -40 },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + 2,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  switchText: { fontSize: 14 },
  soon: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  unit: { gap: Spacing.three },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  topicLine: { flex: 1, height: 1 },
  topicText: { fontSize: 11 },
});
