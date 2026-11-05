import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/math/rich-text';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

type Props = {
  choices: string[];
  selected: number | null;
  onSelect: (index: number) => void;
  /** Set once the answer is graded. Choices lock and show right/wrong. */
  correctChoice: number | null;
  locked: boolean;
};

const LETTERS = 'ABCDEF';

export function ChoiceList({ choices, selected, onSelect, correctChoice, locked }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {choices.map((choice, index) => {
        const isSelected = selected === index;
        const isCorrect = correctChoice === index;
        const isWrongPick = correctChoice !== null && isSelected && !isCorrect;

        let border = theme.border;
        let background = theme.surface;
        let badge = theme.surfaceAlt;
        let badgeText = theme.textSecondary;
        if (isCorrect) {
          border = theme.success;
          background = theme.successSoft;
          badge = theme.success;
          badgeText = theme.onSuccess;
        } else if (isWrongPick) {
          border = theme.error;
          background = theme.errorSoft;
          badge = theme.error;
          badgeText = theme.onError;
        } else if (isSelected) {
          border = theme.primary;
          background = theme.primarySoft;
          badge = theme.primary;
          badgeText = theme.onPrimary;
        }

        return (
          <Pressable
            key={index}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: locked }}
            disabled={locked}
            onPress={() => {
              haptics.tap();
              onSelect(index);
            }}
            style={({ pressed }) => [
              styles.choice,
              { borderColor: border, backgroundColor: background },
              pressed && !locked && styles.pressed,
            ]}>
            <View style={[styles.badge, { backgroundColor: badge }]}>
              {isCorrect ? (
                <Ionicons name="checkmark" size={18} color={badgeText} />
              ) : isWrongPick ? (
                <Ionicons name="close" size={18} color={badgeText} />
              ) : (
                <Text variant="label" style={{ color: badgeText }}>
                  {LETTERS[index]}
                </Text>
              )}
            </View>
            <View style={styles.choiceText}>
              <RichText source={choice} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { flex: 1 },
});
