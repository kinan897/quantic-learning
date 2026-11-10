/**
 * The lesson player.
 *
 * A lesson is a list of items: teaching cards (read, then Continue) and questions.
 * Opening a lesson starts a session on the server. Questions arrive without answers, and
 * every attempt is graded and recorded by the API. A missed question goes to the back of
 * the queue, so the lesson ends only after every question has been answered correctly at
 * least once. The server then works out first-try accuracy, XP and streak from its own
 * records. The app never reports a score.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import {
  useCheckAnswer,
  useCompleteLesson,
  useLesson,
  useStartLessonSession,
} from '@/api/hooks';
import type { CheckResponse, LessonDetail, Reward } from '@/api/types';
import { BlockView } from '@/components/lesson/blocks';
import { ChoiceList } from '@/components/lesson/choice-list';
import { FeedbackPanel } from '@/components/lesson/feedback-panel';
import { LessonComplete } from '@/components/lesson/lesson-complete';
import { MathAnswerBox, MathKeypad } from '@/components/lesson/math-input';
import { TeachCardView } from '@/components/lesson/teach-card';
import { RichText } from '@/components/math/rich-text';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

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
        <ErrorState
          message={error?.message ?? 'Lesson not found.'}
          // A locked lesson won't open by retrying.
          onRetry={error instanceof ApiError && error.status === 403 ? undefined : () => void refetch()}
        />
      )}
    </SafeAreaView>
  );
}

type Phase = 'answering' | 'feedback' | 'finishing' | 'complete';

function LessonPlayer({ lesson }: { lesson: LessonDetail }) {
  const theme = useTheme();
  const check = useCheckAnswer();
  const complete = useCompleteLesson();
  const { mutate: startSession, error: sessionError, reset: resetSession } = useStartLessonSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  useEffect(() => {
    startSession(lesson.id, { onSuccess: (session) => setSessionId(session.session_id) });
  }, [lesson.id, sessionAttempt, startSession]);

  const itemsById = useMemo(() => new Map(lesson.items.map((item) => [item.id, item])), [lesson]);
  const total = lesson.items.length;
  const isDestroyer = lesson.kind === 'destroyer';

  const [queue, setQueue] = useState(() => lesson.items.map((item) => item.id));
  const [position, setPosition] = useState(0);
  // Cards read + questions answered correctly. Drives the progress bar.
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');

  const [choice, setChoice] = useState<number | null>(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [inputMessage, setInputMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CheckResponse | null>(null);
  const [showHint, setShowHint] = useState(false);

  const [startedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);

  const item = itemsById.get(queue[position])!;
  const question = item.type === 'teach' ? null : item;
  const isRetry = position >= total;
  const hasAnswer =
    question?.type === 'multiple_choice' ? choice !== null : mathAnswer.trim().length > 0;
  const canCheck = question !== null && hasAnswer && sessionId !== null;

  function submit() {
    if (!question || !canCheck || check.isPending || phase !== 'answering') return;
    setInputMessage(null);
    const answer = question.type === 'multiple_choice' ? choice! : mathAnswer;
    check.mutate(
      { lessonId: lesson.id, questionId: question.id, sessionId: sessionId!, answer },
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
            setDone((n) => n + 1);
          } else {
            haptics.error();
            setQueue((q) => [...q, question.id]);
          }
        },
        onError: (err) => setInputMessage(err.message),
      },
    );
  }

  function finish() {
    setPhase('finishing');
    complete.mutate(
      { lessonId: lesson.id, sessionId: sessionId! },
      {
        onSuccess: (result) => {
          setReward(result);
          setElapsedMs(Date.now() - startedAt);
          setPhase('complete');
          haptics.success();
        },
      },
    );
  }

  function next() {
    if (item.type === 'teach') setDone((n) => n + 1);
    const nextPosition = position + 1;
    if (nextPosition >= queue.length) {
      finish();
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
    return (
      <LessonComplete reward={reward} kind={lesson.kind} elapsedMs={elapsedMs} onDone={closeLesson} />
    );
  }

  if (phase === 'finishing' || sessionError) {
    const failure = complete.error ?? sessionError;
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <CloseButton />
        {failure ? (
          <ErrorState
            message={failure.message}
            onRetry={() => {
              if (sessionError) {
                resetSession();
                setSessionAttempt((n) => n + 1);
              } else {
                finish();
              }
            }}
          />
        ) : (
          <LoadingState label="Saving your progress…" />
        )}
      </SafeAreaView>
    );
  }

  const answering = phase === 'answering';

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, styles.column]}>
        <CloseButton />
        <ProgressBar progress={done / total} />
        {isDestroyer && (
          <View style={[styles.destroyerPill, { backgroundColor: theme.destroyer }]}>
            <Ionicons name="skull" size={14} color={theme.surface} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {question === null && item.type === 'teach' ? (
          <Animated.View key={position} entering={FadeInRight.duration(250)} style={styles.column}>
            <TeachCardView card={item} />
          </Animated.View>
        ) : question ? (
        <Animated.View key={position} entering={FadeInRight.duration(250)} style={[styles.column, styles.question]}>
          {isRetry && (
            <View style={[styles.retryBadge, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="refresh" size={14} color={theme.primary} />
              <Text variant="caption" tone="primary" style={styles.bold}>
                Let&apos;s try this one again
              </Text>
            </View>
          )}

          <Text
            variant="caption"
            tone="secondary"
            style={[styles.eyebrow, isDestroyer && { color: theme.destroyer }]}>
            {isDestroyer
              ? 'DESTROYER QUESTION'
              : question.type === 'multiple_choice'
                ? 'CHOOSE THE ANSWER'
                : 'TYPE YOUR ANSWER'}
          </Text>
          <RichText source={question.prompt} size="large" />
          {question.figure && <BlockView block={question.figure} />}

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
        ) : null}
      </ScrollView>

      {item.type === 'teach' ? (
        <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={[styles.column, styles.footerInner]}>
            <Button title="Continue" icon="arrow-forward" onPress={next} disabled={sessionId === null} />
          </View>
        </SafeAreaView>
      ) : answering && question ? (
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
        feedback &&
        question && <FeedbackPanel feedback={feedback} questionType={question.type} onContinue={next} />
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
  destroyerPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
