import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { View } from 'react-native';

import { apiFetch } from '@/api/client';
import type { AuthResponse } from '@/api/types';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useTheme } from '@/hooks/use-theme';
import { deviceTimezone, useAuth } from '@/store/auth';

/** True once the saved session has been read from secure storage. */
function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuth.persist.onFinishHydration(onChange),
    () => useAuth.persist.hasHydrated(),
    () => false,
  );
}

/**
 * Makes sure there's always a session. On first launch (or after signing out) it quietly
 * creates a guest account, so students can start a lesson right away and nothing they do
 * is lost. Signing up later upgrades this same account.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const hydrated = useAuthHydrated();
  const hasSession = useAuth((s) => s.refreshToken !== null);
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hydrated || hasSession) return;
    let cancelled = false;
    apiFetch<AuthResponse>(
      '/auth/guest',
      { method: 'POST', body: JSON.stringify({ timezone: deviceTimezone() }) },
      { auth: false },
    )
      .then((auth) => {
        if (!cancelled) setSession(auth);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, hasSession, attempt, setSession]);

  if (hydrated && hasSession) return children;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <LoadingState label="Getting things ready…" />
      )}
    </View>
  );
}
