/** Device-only preferences. Progress itself lives on the server. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 'dark' is the default, matching the website. 'system' follows the phone's setting. */
export type ThemeMode = 'dark' | 'light' | 'system';

type Preferences = {
  activeCourseId: string;
  themeMode: ThemeMode;
  setActiveCourse: (courseId: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      activeCourseId: 'mcv4u',
      themeMode: 'dark',
      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    { name: 'quantic-preferences', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
