import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/store/auth';

import { apiFetch } from './client';
import type {
  AuthResponse,
  CheckResponse,
  CourseDetail,
  CourseSummary,
  LessonDetail,
  LessonSessionStart,
  Progress,
  Reward,
} from './types';

export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  // Keyed by user, so switching accounts never shows the previous person's data.
  lesson: (userId: string | undefined, id: string) => ['lessons', userId, id] as const,
  progress: (userId: string | undefined, courseId: string) => ['progress', userId, courseId] as const,
};

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

// --- Content ------------------------------------------------------------------------------

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiFetch<CourseSummary[]>('/courses', {}, { auth: false }),
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () =>
      apiFetch<CourseDetail>(`/courses/${encodeURIComponent(courseId)}`, {}, { auth: false }),
  });
}

export function useLesson(lessonId: string) {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: queryKeys.lesson(userId, lessonId),
    queryFn: () => apiFetch<LessonDetail>(`/lessons/${encodeURIComponent(lessonId)}`),
    enabled: !!userId,
    // A locked lesson (403) won't unlock by retrying.
    retry: (count, error) => count < 1 && !('status' in error && error.status === 403),
  });
}

// --- Progress -----------------------------------------------------------------------------

export function useProgress(courseId: string) {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: queryKeys.progress(userId, courseId),
    queryFn: () => apiFetch<Progress>(`/me/progress?course_id=${encodeURIComponent(courseId)}`),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// --- Lessons ------------------------------------------------------------------------------

export function useStartLessonSession() {
  return useMutation({
    mutationFn: (lessonId: string) =>
      apiFetch<LessonSessionStart>(`/lessons/${encodeURIComponent(lessonId)}/sessions`, {
        method: 'POST',
      }),
  });
}

export type CheckAnswerInput = {
  lessonId: string;
  questionId: string;
  sessionId: string;
  answer: string | number;
};

export function useCheckAnswer() {
  return useMutation({
    mutationFn: ({ lessonId, questionId, sessionId, answer }: CheckAnswerInput) =>
      apiFetch<CheckResponse>(
        `/lessons/${encodeURIComponent(lessonId)}/questions/${encodeURIComponent(questionId)}/check`,
        json({ answer, session_id: sessionId }),
      ),
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, sessionId }: { lessonId: string; sessionId: string }) =>
      apiFetch<Reward>(
        `/lessons/${encodeURIComponent(lessonId)}/sessions/${encodeURIComponent(sessionId)}/complete`,
        { method: 'POST' },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  });
}

// --- Accounts -----------------------------------------------------------------------------

/** After any sign-in/out, drop cached per-user data so nothing leaks between accounts. */
function useAfterAuthChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: ['progress'] });
    queryClient.removeQueries({ queryKey: ['lessons'] });
  };
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  timezone: string;
};

export function useRegister() {
  const setSession = useAuth((s) => s.setSession);
  const afterAuthChange = useAfterAuthChange();
  return useMutation({
    // Sent with the guest's token, so the server upgrades the guest and keeps their progress.
    mutationFn: ({ email, password, displayName, timezone }: RegisterInput) =>
      apiFetch<AuthResponse>(
        '/auth/register',
        json({ email, password, display_name: displayName, timezone }),
      ),
    onSuccess: (auth) => {
      setSession(auth);
      afterAuthChange();
    },
  });
}

export function useSignIn() {
  const setSession = useAuth((s) => s.setSession);
  const afterAuthChange = useAfterAuthChange();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/login', json({ email, password }), { auth: false }),
    onSuccess: (auth) => {
      setSession(auth);
      afterAuthChange();
    },
  });
}

export function useSignOut() {
  const clearSession = useAuth((s) => s.clearSession);
  const afterAuthChange = useAfterAuthChange();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuth.getState().refreshToken;
      if (refreshToken) {
        // Best effort: even if this fails, the device forgets the tokens.
        await apiFetch<void>('/auth/logout', json({ refresh_token: refreshToken }), {
          auth: false,
        }).catch(() => undefined);
      }
    },
    onSettled: () => {
      clearSession();
      afterAuthChange();
    },
  });
}
