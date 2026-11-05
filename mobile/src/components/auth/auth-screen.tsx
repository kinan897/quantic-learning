import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function closeAuthScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type Props = {
  title: string;
  subtitle: string;
  error: string | null;
  children: ReactNode;
};

/** Shared frame for the sign-up and sign-in screens. */
export function AuthScreen({ title, subtitle, error, children }: Props) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={closeAuthScreen}>
            <Ionicons name="close" size={28} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.titles}>
              <Text variant="title">{title}</Text>
              <Text tone="secondary">{subtitle}</Text>
            </View>
            {error && (
              <Animated.View
                entering={FadeIn}
                accessibilityLiveRegion="polite"
                style={[styles.error, { backgroundColor: theme.errorSoft }]}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <Text style={[styles.flex, { color: theme.error }]}>{error}</Text>
              </Animated.View>
            )}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  scroll: { padding: Spacing.four, paddingTop: Spacing.two },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: Spacing.four },
  logo: { width: 56, height: 56 },
  titles: { gap: Spacing.one },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
