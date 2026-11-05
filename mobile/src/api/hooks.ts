import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';
import type { CheckResponse, CourseDetail, CourseSummary, LessonDetail } from './types';

export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  lesson: (id: string) => ['lessons', id] as const,
};

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiFetch<CourseSummary[]>('/courses'),
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => apiFetch<CourseDetail>(`/courses/${encodeURIComponent(courseId)}`),
  });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: () => apiFetch<LessonDetail>(`/lessons/${encodeURIComponent(lessonId)}`),
  });
}

export type CheckAnswerInput = {
  lessonId: string;
  questionId: string;
  answer: string | number;
};

export function useCheckAnswer() {
  return useMutation({
    mutationFn: ({ lessonId, questionId, answer }: CheckAnswerInput) =>
      apiFetch<CheckResponse>(
        `/lessons/${encodeURIComponent(lessonId)}/questions/${encodeURIComponent(questionId)}/check`,
        { method: 'POST', body: JSON.stringify({ answer }) },
      ),
  });
}
