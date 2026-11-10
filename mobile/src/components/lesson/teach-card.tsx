import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { TeachCard } from '@/api/types';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { BlockView } from './blocks';

/** One idea from a Learn lesson: a title, then text, graphs, diagrams and key-idea boxes. */
export function TeachCardView({ card }: { card: TeachCard }) {
  const theme = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.eyebrow}>
        <Ionicons name="book" size={14} color={theme.primary} />
        <Text variant="caption" tone="primary" style={styles.eyebrowText}>
          LEARN
        </Text>
      </View>
      <Text variant="title" accessibilityRole="header">
        {card.title}
      </Text>
      {card.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  eyebrowText: { fontWeight: '800', letterSpacing: 1.2 },
});
