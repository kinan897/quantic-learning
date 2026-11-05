/**
 * The lesson player.
 *
 * Questions are served without answers, and every attempt is graded by the API.
 * A missed question goes to the back of the queue, so the lesson ends only after every
 * question has been answered correctly at least once. First-try accuracy is what counts
 * toward the score and the perfect-lesson bonus.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCheckAnswer, useLesson } from '@/api/hooks';
import type { CheckResponse, LessonDetail } from '@/api/types';
import { ChoiceList } from '@/components/lesson/choice-list';
import { FeedbackPanel } from '@/components/lesson/feedback-panel';
import { LessonComplete } from '@/components/lesson/lesson-complete';
import { MathAnswerBox, MathKeypad } from '@/components/lesson/math-input';
import { RichText } from '@/components/math/rich-text';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { useProgress, type LessonReward } from '@/store/progress';

function closeLesson() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: lesson, isPending, error, refetch } = useLesson(id);

  if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <CloseButton />
      {isPending ? (
        <LoadingState label="Preparing your lesson…" />
      ) : (
        <ErrorState message={error?.message ?? 'Lesson not found.'} onRetry={() => void refetch()} />
      )}
    </SafeAreaView>
  );
}

type Phase = 'answering' | 'feedback' | 'complete';

function LessonPlayer({ lesson }: { lesson: LessonDetail }) {
  const theme = useTheme();
  const completeLesson = useProgress((s) => s.completeLesson);
  const check = useCheckAnswer();

  const questionsById = useMemo(() => new Map(lesson.questions.map((q) => [q.id, q])), [lesson]);
  const total = lesson.questions.length;

  const [queue, setQueue] = useState(() => lesson.questions.map((q) => q.id));
  const [position, setPosition] = useState(0);
  const [missed, setMissed] = useState<ReadonlySet<string>>(() => new Set());
  const [solved, setSolved] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');

  const [choice, setChoice] = useState<number | null>(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [inputMessage, setInputMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CheckResponse | null>(null);
  const [showHint, setShowHint] = useState(false);

  const [startedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reward, setReward] = useState<LessonReward | null>(null);

  const question = questionsById.get(queue[position])!;
  const isRetry = position >= total;
  const canCheck =
    question.type === 'multiple_choice' ? choice !== null : mathAnswer.trim().length > 0;

  function submit() {
    if (!canCheck || check.isPending || phase !== 'answering') return;
    setInputMessage(null);
    const answer = question.type === 'multiple_choice' ? choice! : mathAnswer;
    check.mutate(
      { lessonId: lesson.id, questionId: question.id, answer },
      {
        onSuccess: (result) => {
          if (result.result === 'invalid') {
            // A typo isn't a wrong answer: explain and let them fix it.
            setInputMessage(result.message ?? 'Check the format of your answer.');
            return;
          }
          setFeedback(result);
          setPhase('feedback');
          if (result.result === 'correct') {
            haptics.success();
            setSolved((n) => n + 1);
          } else {
            haptics.error();
            setMissed((prev) => new Set(prev).add(question.id));
            setQueue((q) => [...q, question.id]);
          }
        },
        onError: (err) => setInputMessage(err.message),
      },
    );
  }

  function next() {
    const nextPosition = position + 1;
    if (nextPosition >= queue.length) {
      setReward(
        completeLesson({
          lessonId: lesson.id,
          baseXp: lesson.xp,
          totalQuestions: total,
          firstTryCorrect: total - missed.size,
        }),
      );
      setElapsedMs(Date.now() - startedAt);
      setPhase('complete');
      haptics.success();
      return;
    }
    setPosition(nextPosition);
    setChoice(null);
    setMathAnswer('');
    setInputMessage(null);
    setFeedback(null);
    setShowHint(false);
    setPhase('answering');
  }

  if (phase === 'complete' && reward) {
    return <LessonComplete reward={reward} elapsedMs={elapsedMs} onDone={closeLesson} />;
  }

  const answering = phase === 'answering';

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, styles.column]}>
        <CloseButton />
        <ProgressBar progress={solved / total} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Animated.View key={position} entering={FadeInRight.duration(250)} style={[styles.column, styles.question]}>
          {isRetry && (
            <View style={[styles.retryBadge, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="refresh" size={14} color={theme.primary} />
              <Text variant="caption" tone="primary" style={styles.bold}>
                Let&apos;s try this one again
              </Text>
            </View>
          )}

          <Text variant="caption" tone="secondary" style={styles.eyebrow}>
            {question.type === 'multiple_choice' ? 'CHOOSE THE ANSWER' : 'TYPE YOUR ANSWER'}
          </Text>
          <RichText source={question.prompt} size="large" />

          {question.hint && answering && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowHint((v) => !v)}
              style={styles.hintToggle}>
              <Ionicons name="bulb-outline" size={18} color={theme.xp} />
              <Text variant="label" tone="xp">
                {showHint ? 'Hide hint' : 'Show hint'}
              </Text>
            </Pressable>
          )}
          {showHint && question.hint && (
            <Animated.View
              entering={FadeIn}
              style={[styles.hint, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <RichText source={question.hint} size="small" />
            </Animated.View>
          )}

          <View style={styles.answerArea}>
            {question.type === 'multiple_choice' ? (
              <ChoiceList
                choices={question.choices}
                selected={choice}
                onSelect={setChoice}
                correctChoice={feedback?.correct_choice ?? null}
                locked={!answering}
              />
            ) : (
              <MathAnswerBox
                value={mathAnswer}
                onChange={(v) => {
                  setMathAnswer(v);
                  setInputMessage(null);
                }}
                onSubmit={submit}
                placeholder={question.placeholder}
                disabled={!answering}
              />
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {answering ? (
        <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={[styles.column, styles.footerInner]}>
            {inputMessage && (
              <Animated.View
                entering={FadeIn}
                style={[styles.message, { backgroundColor: theme.errorSoft }]}
                accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <Text style={[styles.flex, { color: theme.error }]}>{inputMessage}</Text>
              </Animated.View>
            )}
            {question.type === 'math_input' && (
              <MathKeypad
                value={mathAnswer}
                onChange={(v) => {
                  setMathAnswer(v);
                  setInputMessage(null);
                }}
                variables={question.variables}
              />
            )}
            <Button title="Check" onPress={submit} disabled={!canCheck} loading={check.isPending} />
          </View>
        </SafeAreaView>
      ) : (
        feedback && <FeedbackPanel feedback={feedback} questionType={question.type} onContinue={next} />
      )}
    </SafeAreaView>
  );
}

function CloseButton() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close lesson"
      hitSlop={12}
      onPress={closeLesson}
      style={styles.close}>
      <Ionicons name="close" size={28} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  close: { padding: Spacing.one },
  scrollContent: { padding: Spacing.three, paddingBottom: Spacing.five },
  question: { gap: Spacing.three },
  eyebrow: { fontWeight: '800', letterSpacing: 1.2 },
  bold: { fontWeight: '700' },
  retryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start' },
  hint: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1 },
  answerArea: { marginTop: Spacing.two },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  footerInner: { padding: Spacing.three, gap: Spacing.three },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
