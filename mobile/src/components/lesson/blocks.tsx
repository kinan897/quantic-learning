import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { API_URL } from '@/api/client';
import type { Block, CalloutBlock, ImageData } from '@/api/types';
import { Graph } from '@/components/graph/graph';
import { RichText } from '@/components/math/rich-text';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Renders one piece of lesson content: text, a key-idea box, a graph or a diagram. */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return <RichText source={block.md} />;
    case 'callout':
      return <Callout block={block} />;
    case 'graph':
      return <Graph graph={block} />;
    case 'image':
      return <Diagram image={block} />;
  }
}

const CALLOUT = {
  key: { icon: 'key', title: 'Key idea' },
  tip: { icon: 'bulb', title: 'Tip' },
  warning: { icon: 'warning', title: 'Watch out' },
} as const;

function Callout({ block }: { block: CalloutBlock }) {
  const theme = useTheme();
  const tone = {
    key: { bg: theme.primarySoft, fg: theme.primary },
    tip: { bg: theme.accentSoft, fg: theme.accent },
    warning: { bg: theme.destroyerSoft, fg: theme.destroyer },
  }[block.tone];
  const meta = CALLOUT[block.tone];
  return (
    <View style={[styles.callout, { backgroundColor: tone.bg, borderLeftColor: tone.fg }]}>
      <View style={styles.calloutTitle}>
        <Ionicons name={meta.icon} size={16} color={tone.fg} />
        <Text variant="label" style={{ color: tone.fg }}>
          {block.title ?? meta.title}
        </Text>
      </View>
      <RichText source={block.md} />
    </View>
  );
}

function Diagram({ image }: { image: ImageData }) {
  const theme = useTheme();
  return (
    <View style={styles.diagram}>
      <Image
        source={{ uri: `${API_URL}${image.url}` }}
        accessibilityLabel={image.alt}
        contentFit="contain"
        style={[styles.image, { aspectRatio: 1 / image.aspect, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      {image.caption && <RichText source={image.caption} size="small" color="textSecondary" />}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    borderLeftWidth: 4,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  calloutTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  diagram: { gap: Spacing.two, alignSelf: 'stretch' },
  image: { width: '100%', borderRadius: Radius.md, borderWidth: 1 },
});
