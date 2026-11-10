/**
 * Courses tab: pick a subject, then a grade.
 *
 * Instead of one long list, each subject is a tile (Physics, Chemistry, ...). Tapping a tile
 * opens a panel with its courses by grade (Grade 11 · SPH3U, Grade 12 · SPH4U). A Continue
 * card at the top takes students straight back to the course they're studying.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProgress, useSubjects } from '@/api/hooks';
import type { CourseSummary, Subject } from '@/api/types';
import { OrbitDecoration } from '@/components/ui/orbit';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, Glow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { usePreferences } from '@/store/preferences';

type IconName = keyof typeof Ionicons.glyphMap;

export default function CoursesScreen() {
  const theme = useTheme();
  const { data: subjects, error, refetch } = useSubjects();
  const activeCourseId = usePreferences((s) => s.activeCourseId);
  const setActiveCourse = usePreferences((s) => s.setActiveCourse);
  const [openSubject, setOpenSubject] = useState<Subject | null>(null);

  const activeCourse = subjects?.flatMap((s) => s.courses).find((c) => c.id === activeCourseId);

  const choose = (course: CourseSummary) => {
    haptics.tap();
    setActiveCourse(course.id);
    setOpenSubject(null);
    router.navigate('/');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.header}>
            <OrbitDecoration size={180} opacity={0.4} style={styles.orbit} />
            <Text variant="eyebrow">Subjects</Text>
            <Text variant="title" style={styles.title}>
              What are you <Text variant="title" tone="accent" style={styles.title}>studying?</Text>
            </Text>
          </View>

          {error ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : !subjects ? (
            <LoadingState label="Loading subjects…" />
          ) : (
            <>
              {activeCourse && <ContinueCard course={activeCourse} />}
              <View style={styles.grid}>
                {subjects.map((subject) => (
                  <SubjectTile
                    key={subject.id}
                    subject={subject}
                    current={subject.courses.some((c) => c.id === activeCourseId)}
                    onPress={() => {
                      haptics.tap();
                      setOpenSubject(subject);
                    }}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <SubjectSheet
        subject={openSubject}
        activeCourseId={activeCourseId}
        onChoose={choose}
        onClose={() => setOpenSubject(null)}
      />
    </SafeAreaView>
  );
}

/** Jump back into the current course, with progress at a glance. */
function ContinueCard({ course }: { course: CourseSummary }) {
  const progress = useProgress(course.id).data;
  const done = progress ? Object.keys(progress.lessons).length : 0;
  const total = Math.max(course.lesson_count, 1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue ${course.title}, ${done} of ${course.lesson_count} lessons done`}
      onPress={() => router.navigate('/')}
      style={({ pressed }) => [styles.continueShadow, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <LinearGradient
        colors={[Brand.electric, Brand.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.continueCard}>
        <View style={styles.continueText}>
          <Text variant="eyebrow" style={styles.continueEyebrow}>
            Continue · {course.code}
          </Text>
          <Text variant="heading" style={styles.white} numberOfLines={1}>
            {course.title}
          </Text>
          <View style={styles.continueProgress}>
            <ProgressBar progress={done / total} height={6} />
            <Text variant="caption" style={styles.continueCount}>
              {done}/{course.lesson_count}
            </Text>
          </View>
        </View>
        <View style={styles.continueArrow}>
          <Ionicons name="arrow-forward" size={20} color={Brand.navy} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SubjectTile({
  subject,
  current,
  onPress,
}: {
  subject: Subject;
  current: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const dark = useIsDark();
  const count = subject.courses.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.title}, ${count} ${count === 1 ? 'course' : 'courses'}${current ? ', current subject' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: current ? theme.accent : theme.border,
          boxShadow: current ? Glow.sky : undefined,
          transform: [{ translateY: pressed ? -2 : 0 }],
        },
      ]}>
      <LinearGradient
        colors={dark ? ['rgba(13, 20, 48, 1)', 'rgba(11, 26, 74, 0.55)'] : [theme.surface, theme.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.tileInner}>
        <View style={styles.tileTop}>
          <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name={subject.icon as IconName} size={24} color={theme.accent} />
          </View>
          {current && <View style={[styles.currentDot, { backgroundColor: theme.accent }]} />}
        </View>
        <Text variant="heading" style={styles.tileTitle}>
          {subject.title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {subject.tagline}
        </Text>
        <Text variant="caption" style={[styles.tileCount, { color: theme.accent }]}>
          {count} {count === 1 ? 'course' : 'courses'}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Bottom panel listing a subject's courses by grade. */
function SubjectSheet({
  subject,
  activeCourseId,
  onChoose,
  onClose,
}: {
  subject: Subject | null;
  activeCourseId: string;
  onChoose: (course: CourseSummary) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={subject !== null} transparent animationType="none" onRequestClose={onClose}>
      {subject && (
        <View style={styles.modalRoot}>
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20)}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two,
              },
            ]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeader}>
              <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name={subject.icon as IconName} size={24} color={theme.accent} />
              </View>
              <View style={styles.flex}>
                <Text variant="title" style={styles.sheetTitle}>
                  {subject.title}
                </Text>
                <Text variant="caption" tone="secondary">
                  Choose your grade or course
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose}>
                <Ionicons name="close" size={26} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.rows}>
              {subject.courses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  active={course.id === activeCourseId}
                  onPress={() => onChoose(course)}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

function CourseRow({
  course,
  active,
  onPress,
}: {
  course: CourseSummary;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const soon = course.status === 'coming_soon';
  const gradeBadge = course.grade ? `GR ${course.grade}` : course.code;
  const subtitle = course.grade ? `${course.code} · ${course.lesson_count} lessons` : `${course.grade_label} · ${course.lesson_count} lessons`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: soon, selected: active }}
      accessibilityLabel={`${course.grade ? `Grade ${course.grade} ` : ''}${course.title}${active ? ', current course' : ''}${soon ? ', coming soon' : ''}`}
      disabled={soon}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: active ? theme.accentSoft : theme.surface,
          borderColor: active ? theme.accent : theme.border,
          opacity: soon ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.gradeBadge, { backgroundColor: active ? theme.accent : theme.accentSoft }]}>
        <Text variant="caption" style={[styles.gradeText, { color: active ? theme.onAccent : theme.accent }]}>
          {gradeBadge}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="bodyBold" numberOfLines={1}>
          {course.title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {soon ? 'Coming soon' : subtitle}
        </Text>
      </View>
      {active ? (
        <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  white: { color: Brand.white },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.five },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  header: { gap: Spacing.one, paddingTop: Spacing.two },
  title: { fontSize: 28, lineHeight: 34 },
  orbit: { right: -50, top: -50 },

  continueShadow: { borderRadius: Radius.lg, boxShadow: Glow.primary },
  continueCard: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  continueText: { flex: 1, gap: 2 },
  continueEyebrow: { color: '#CFE6FF', fontSize: 11 },
  continueProgress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  continueCount: { color: Brand.white, fontWeight: '700' },
  continueArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three - 4 },
  tile: { flexBasis: '46%', flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  // flexGrow so the background fills the tile when its neighbour in the row is taller.
  tileInner: { padding: Spacing.three, gap: 2, minHeight: 148, flexGrow: 1 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  currentDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  tileTitle: { fontSize: 18 },
  tileCount: { marginTop: 'auto', paddingTop: Spacing.two, fontWeight: '700' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(2, 5, 15, 0.6)' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  sheetTitle: { fontSize: 24, lineHeight: 30 },
  rows: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  gradeBadge: { minWidth: 64, paddingHorizontal: Spacing.two, paddingVertical: 6, borderRadius: Radius.sm, alignItems: 'center' },
  gradeText: { fontWeight: '800', letterSpacing: 1 },
});
