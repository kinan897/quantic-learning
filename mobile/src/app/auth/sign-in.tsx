import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useProgress, useSignIn } from '@/api/hooks';
import { AuthScreen, closeAuthScreen } from '@/components/auth/auth-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/store/auth';
import { usePreferences } from '@/store/preferences';

export default function SignInScreen() {
  const signIn = useSignIn();
  const isGuest = useAuth((s) => s.user?.is_guest ?? true);
  const courseId = usePreferences((s) => s.activeCourseId);
  const guestXp = useProgress(courseId).data?.total_xp ?? 0;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    const problem = !email.trim() ? 'Enter your email.' : !password ? 'Enter your password.' : null;
    setFormError(problem);
    if (problem) return;
    signIn.mutate({ email: email.trim(), password }, { onSuccess: closeAuthScreen });
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      error={formError ?? signIn.error?.message ?? null}>
      {isGuest && guestXp > 0 && (
        <Text variant="caption" tone="secondary">
          Heads up: signing in switches to that account. The {guestXp} XP from this guest session
          stays with the guest. To keep it, create a new account instead.
        </Text>
      )}
      <View style={styles.fields}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          maxLength={128}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      <Button title="Sign in" onPress={submit} loading={signIn.isPending} />

      <Pressable
        accessibilityRole="link"
        onPress={() => router.replace('/auth/sign-up')}
        style={styles.switch}>
        <Text tone="secondary">
          New to Quantic?{' '}
          <Text tone="primary" style={styles.bold}>
            Create an account
          </Text>
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
  bold: { fontWeight: '700' },
  switch: { alignSelf: 'center', padding: Spacing.two },
});
