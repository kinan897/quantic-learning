/**
 * The signed-in session (guest or full account), saved in secure storage so students stay
 * signed in between launches.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthResponse, User } from '@/api/types';
import { secureStorage } from '@/lib/secure-storage';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (auth: AuthResponse) => void;
  clearSession: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (auth) =>
        set({ user: auth.user, accessToken: auth.access_token, refreshToken: auth.refresh_token }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'quantic-auth',
      version: 1,
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Toronto';
  }
}
