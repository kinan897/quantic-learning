import { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import MathView from './math-view';

// Anything with math or Markdown formatting needs the KaTeX renderer. Plain sentences
// render as native text, which is faster and avoids a WebView on phones.
const NEEDS_RENDERER = /[$*`_#|\\]|\n|^\s*[-+]\s/;

const SIZES = { small: 15, body: 17, large: 21 } as const;

type Props = {
  source: string;
  size?: keyof typeof SIZES;
  align?: 'left' | 'center';
  color?: keyof ThemeColors;
};

export function RichText({ source, size = 'body', align = 'left', color = 'text' }: Props) {
  const theme = useTheme();
  const fontSize = SIZES[size];
  const [height, setHeight] = useState(Math.round(fontSize * 1.6));
  const onHeight = useCallback((h: number) => setHeight((prev) => (prev === h ? prev : h)), []);

  if (!NEEDS_RENDERER.test(source)) {
    return (
      <Text style={{ fontSize, lineHeight: fontSize * 1.45, textAlign: align, color: theme[color] }}>
        {source}
      </Text>
    );
  }

  const view = (
    <MathView
      source={source}
      color={theme[color]}
      fontSize={fontSize}
      align={align}
      onHeight={Platform.OS === 'web' ? undefined : onHeight}
      dom={{ scrollEnabled: false, style: { backgroundColor: 'transparent' } }}
    />
  );

  // pointerEvents "none" lets taps and scrolls pass through to the parent (e.g. a choice
  // button), since a WebView would otherwise swallow them on phones.
  if (Platform.OS === 'web') {
    return <View style={{ pointerEvents: 'none', alignSelf: 'stretch' }}>{view}</View>;
  }
  return <View style={{ height, alignSelf: 'stretch', pointerEvents: 'none' }}>{view}</View>;
}
