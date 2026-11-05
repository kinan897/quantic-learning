import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CheckResponse } from '@/api/types';
import { RichText } from '@/components/math/rich-text';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PRAISE = ['Nice work!', 'Exactly right!', 'Nailed it!', 'Correct!', 'Well done!'];

type Props = {
  feedback: CheckResponse;
  questionType: 'multiple_choice' | 'math_input';
  onContinue: () => void;
};

export function FeedbackPanel({ feedback, questionType, onContinue }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const correct = feedback.result === 'correct';
  const tint = correct ? theme.success : theme.error;
  // Chosen once when the panel appears, so it doesn't change on re-render.
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  const title = correct ? praise : 'Not quite';

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20)}
      accessibilityLiveRegion="polite"
      style={[
        styles.panel,
        {
          backgroundColor: correct ? theme.successSoft : theme.errorSoft,
          borderTopColor: tint,
          paddingBottom: Math.max(insets.bottom, Spacing.three),
        },
      ]}>
      <View style={styles.inner}>
        <View style={styles.titleRow}>
          <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={30} color={tint} />
          <Text variant="title" style={{ color: tint }}>
            {title}
          </Text>
        </View>

        <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
          {!correct && feedback.correct_answer && questionType === 'math_input' && (
            <View style={styles.section}>
              <Text variant="label" style={{ color: tint }}>
                Correct answer
              </Text>
              <RichText source={feedback.correct_answer} />
            </View>
          )}
          {feedback.explanation && (
            <View style={styles.section}>
              <Text variant="label" style={{ color: tint }}>
                {correct ? 'Why it works' : "Here's how to solve it"}
              </Text>
              <RichText source={feedback.explanation} size="small" />
            </View>
          )}
          {!correct && (
            <Text variant="caption" tone="secondary">
              This question will come back at the end of the lesson.
            </Text>
          )}
        </ScrollView>

        <Button
          title={correct ? 'Continue' : 'Got it'}
          variant={correct ? 'success' : 'danger'}
          onPress={onContinue}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 3,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  details: { maxHeight: 320 },
  detailsContent: { gap: Spacing.three },
  section: { gap: Spacing.one },
});
