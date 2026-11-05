/**
 * Typed-math answers: a display box plus an on-screen keypad.
 *
 * On phones the keypad is the only input, so the system keyboard never covers the question.
 * On web the box is also a normal text field, so desktop users can type with a keyboard.
 *
 * The answer is kept in the plain syntax the backend grader parses (e.g. "sqrt(x)/2"), and
 * the box shows a prettier version (e.g. "√(x)/2").
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

type Key = { label: string; insert: string; kind?: 'fn' | 'op' | 'var' };

const FUNCTION_ROW: Key[] = [
  { label: 'sin', insert: 'sin(', kind: 'fn' },
  { label: 'cos', insert: 'cos(', kind: 'fn' },
  { label: 'tan', insert: 'tan(', kind: 'fn' },
  { label: 'ln', insert: 'ln(', kind: 'fn' },
  { label: 'log', insert: 'log(', kind: 'fn' },
  { label: '√', insert: 'sqrt(', kind: 'fn' },
];

const GRID: Key[][] = [
  [d('7'), d('8'), d('9'), op('(', '('), op(')', ')'), op('xʸ', '^')],
  [d('4'), d('5'), d('6'), op('×', '*'), op('÷', '/'), op('π', 'pi')],
  [d('1'), d('2'), d('3'), op('+', '+'), op('−', '-'), op('e', 'e')],
];

function d(n: string): Key {
  return { label: n, insert: n };
}
function op(label: string, insert: string): Key {
  return { label, insert, kind: 'op' };
}

// Deleting "sin(" one letter at a time would leave "si" behind, so remove whole tokens.
const MULTI_CHAR_TOKENS = ['sqrt(', 'sin(', 'cos(', 'tan(', 'ln(', 'log(', 'pi'];

export function backspace(value: string): string {
  const token = MULTI_CHAR_TOKENS.find((t) => value.endsWith(t));
  return value.slice(0, value.length - (token?.length ?? 1));
}

export function prettify(value: string): string {
  return value.replace(/sqrt/g, '√').replace(/pi/g, 'π').replace(/\*/g, '×');
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  variables: string[];
  placeholder: string | null;
  disabled: boolean;
};

export function MathAnswerBox({ value, onChange, onSubmit, placeholder, disabled }: Omit<Props, 'variables'>) {
  const theme = useTheme();
  const boxStyle = [
    styles.box,
    { borderColor: disabled ? theme.border : theme.primary, backgroundColor: theme.surface },
  ];

  if (Platform.OS === 'web') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        placeholder={placeholder ?? 'Type your answer'}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel="Your answer"
        style={[boxStyle, styles.text, { color: theme.text, outlineStyle: 'none' } as object]}
      />
    );
  }

  return (
    <View style={boxStyle} accessible accessibilityLabel={`Your answer: ${value || 'empty'}`}>
      {value ? (
        <Text style={styles.text}>
          {prettify(value)}
          {!disabled && <Text style={[styles.text, { color: theme.primary }]}>|</Text>}
        </Text>
      ) : (
        <Text style={styles.text} tone="secondary">
          {placeholder ?? 'Use the keypad below'}
        </Text>
      )}
    </View>
  );
}

export function MathKeypad({ value, onChange, variables }: Pick<Props, 'value' | 'onChange' | 'variables'>) {
  const theme = useTheme();
  const press = (insert: string) => {
    haptics.tap();
    onChange(value + insert);
  };

  const lastRow: Key[] = [d('0'), d('.'), ...variables.map((v) => ({ label: v, insert: v, kind: 'var' as const }))];

  const renderKey = (key: Key, i: number) => {
    const background =
      key.kind === 'var' ? theme.primarySoft : key.kind ? theme.surfaceAlt : theme.surface;
    const color = key.kind === 'var' ? theme.primary : theme.text;
    return (
      <Pressable
        key={`${key.label}-${i}`}
        accessibilityRole="button"
        accessibilityLabel={key.label}
        onPress={() => press(key.insert)}
        style={({ pressed }) => [
          styles.key,
          { backgroundColor: background, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Text
          style={[
            styles.keyLabel,
            { color },
            key.kind === 'fn' && styles.fnLabel,
            key.kind === 'var' && styles.varLabel,
          ]}>
          {key.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.keypad}>
      <View style={styles.keyRow}>{FUNCTION_ROW.map(renderKey)}</View>
      {GRID.map((row, r) => (
        <View key={r} style={styles.keyRow}>
          {row.map(renderKey)}
        </View>
      ))}
      <View style={styles.keyRow}>
        {lastRow.map(renderKey)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          accessibilityHint="Long press to clear"
          onPress={() => {
            haptics.tap();
            onChange(backspace(value));
          }}
          onLongPress={() => onChange('')}
          style={({ pressed }) => [
            styles.key,
            styles.wide,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Ionicons name="backspace-outline" size={22} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 60,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  text: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  keypad: { gap: 6 },
  keyRow: { flexDirection: 'row', gap: 6 },
  key: {
    flex: 1,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flexGrow: 2 },
  keyLabel: { fontSize: 19, fontWeight: '600' },
  fnLabel: { fontSize: 15 },
  varLabel: { fontStyle: 'italic', fontWeight: '700' },
});
