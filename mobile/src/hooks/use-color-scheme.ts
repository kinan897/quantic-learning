import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/store/preferences';

/** The colour scheme to draw with: the student's choice, defaulting to dark like the website. */
export function useColorScheme(): 'light' | 'dark' {
  const mode = usePreferences((s) => s.themeMode);
  const system = useSystemColorScheme();
  if (mode === 'system') return system === 'light' ? 'light' : 'dark';
  return mode;
}
