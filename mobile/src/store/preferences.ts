/** Device-only preferences. Progress itself lives on the server. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Preferences = {
  activeCourseId: string;
  setActiveCourse: (courseId: string) => void;
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      activeCourseId: 'mcv4u',
      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),
    }),
    { name: 'quantic-preferences', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
