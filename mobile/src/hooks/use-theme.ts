import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Current colour palette. Follows the device's light/dark setting. */
export function useTheme(): ThemeColors {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
