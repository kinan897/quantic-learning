import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRegister } from '@/api/hooks';
import { AuthScreen, closeAuthScreen } from '@/components/auth/auth-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { deviceTimezone } from '@/store/auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    const problem = !name.trim()
      ? 'Enter your name.'
      : !EMAIL.test(email.trim())
        ? 'Enter a valid email address.'
        : password.length < 8
          ? 'Your password needs at least 8 characters.'
          : null;
    setFormError(problem);
    if (problem) return;
    register.mutate(
      { email: email.trim(), password, displayName: name.trim(), timezone: deviceTimezone() },
      { onSuccess: closeAuthScreen },
    );
  };

  return (
    <AuthScreen
      title="Save your progress"
      subtitle="Create a free account. Your XP, streak and lessons come with you to any device."
      error={formError ?? register.error?.message ?? null}>
      <View style={styles.fields}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="What should we call you?"
          autoComplete="name"
          textContentType="name"
          maxLength={40}
          returnKeyType="next"
        />
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
        <View>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPassword((v) => !v)}
            style={styles.showPassword}>
            <Text variant="caption" tone="primary" style={styles.bold}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Button title="Create account" onPress={submit} loading={register.isPending} />

      <Pressable
        accessibilityRole="link"
        onPress={() => router.replace('/auth/sign-in')}
        style={styles.switch}>
        <Text tone="secondary">
          Already have an account?{' '}
          <Text tone="primary" style={styles.bold}>
            Sign in
          </Text>
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
  showPassword: { alignSelf: 'flex-end', paddingTop: Spacing.two },
  bold: { fontWeight: '700' },
  switch: { alignSelf: 'center', padding: Spacing.two },
});
