/**
 * The student's progress: XP, streak and finished lessons.
 *
 * For now this is stored on the device (AsyncStorage, or localStorage on web). In Step 3 it
 * moves to the server behind user accounts, and this store becomes a cache of it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addDays, localDateKey } from '@/lib/dates';

export type LessonRecord = {
  timesCompleted: number;
  bestAccuracy: number; // 0..1, share of questions right on the first try
  lastCompletedAt: string; // ISO timestamp
};

export type LessonOutcome = {
  lessonId: string;
  baseXp: number;
  totalQuestions: number;
  firstTryCorrect: number;
};

export type LessonReward = {
  xpEarned: number;
  perfectBonus: number;
  accuracy: number;
  streak: number;
  streakExtended: boolean; // true when this lesson started or extended today's streak
  firstCompletion: boolean;
};

type ProgressState = {
  activeCourseId: string;
  totalXp: number;
  streakCount: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  xpByDay: Record<string, number>;
  lessons: Record<string, LessonRecord>;

  setActiveCourse: (courseId: string) => void;
  completeLesson: (outcome: LessonOutcome) => LessonReward;
  resetProgress: () => void;
};

export const PERFECT_BONUS_XP = 5;

const initialState = {
  activeCourseId: 'mcv4u',
  totalXp: 0,
  streakCount: 0,
  lastActiveDate: null,
  xpByDay: {},
  lessons: {},
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveCourse: (courseId) => set({ activeCourseId: courseId }),

      completeLesson: ({ lessonId, baseXp, totalQuestions, firstTryCorrect }) => {
        const state = get();
        const today = localDateKey();
        const previous = state.lessons[lessonId];
        const accuracy = totalQuestions > 0 ? firstTryCorrect / totalQuestions : 0;

        // Full XP the first time, half for practice replays. Flawless runs earn a bonus.
        const lessonXp = previous ? Math.ceil(baseXp / 2) : baseXp;
        const perfectBonus = accuracy === 1 ? PERFECT_BONUS_XP : 0;
        const xpEarned = lessonXp + perfectBonus;

        let streakCount = state.streakCount;
        let streakExtended = false;
        if (state.lastActiveDate !== today) {
          streakExtended = true;
          streakCount = state.lastActiveDate === addDays(today, -1) ? streakCount + 1 : 1;
        }

        set({
          totalXp: state.totalXp + xpEarned,
          streakCount,
          lastActiveDate: today,
          xpByDay: { ...state.xpByDay, [today]: (state.xpByDay[today] ?? 0) + xpEarned },
          lessons: {
            ...state.lessons,
            [lessonId]: {
              timesCompleted: (previous?.timesCompleted ?? 0) + 1,
              bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
              lastCompletedAt: new Date().toISOString(),
            },
          },
        });

        return {
          xpEarned,
          perfectBonus,
          accuracy,
          streak: streakCount,
          streakExtended,
          firstCompletion: !previous,
        };
      },

      resetProgress: () => set(initialState),
    }),
    {
      name: 'quantic-progress',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** The streak as it stands today. It shows 0 once a full day has been missed. */
export function useCurrentStreak(): number {
  const streakCount = useProgress((s) => s.streakCount);
  const lastActiveDate = useProgress((s) => s.lastActiveDate);
  const today = localDateKey();
  if (lastActiveDate === today || lastActiveDate === addDays(today, -1)) return streakCount;
  return 0;
}
