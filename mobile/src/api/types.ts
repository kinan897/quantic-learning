/** Mirrors the backend's public schemas (backend/app/schemas.py). */

export type LessonSummary = {
  id: string;
  title: string;
  description: string;
  xp: number;
  question_count: number;
};

export type Unit = {
  id: string;
  title: string;
  description: string;
  lessons: LessonSummary[];
};

export type CourseSummary = {
  id: string;
  code: string;
  title: string;
  subject: string;
  level: 'high_school' | 'university';
  grade: number | null;
  description: string;
  unit_count: number;
  lesson_count: number;
};

export type CourseDetail = CourseSummary & {
  prerequisites: string[];
  units: Unit[];
};

export type MultipleChoiceQuestion = {
  id: string;
  type: 'multiple_choice';
  prompt: string;
  hint: string | null;
  choices: string[];
};

export type MathInputQuestion = {
  id: string;
  type: 'math_input';
  prompt: string;
  hint: string | null;
  variables: string[];
  placeholder: string | null;
};

export type Question = MultipleChoiceQuestion | MathInputQuestion;

export type LessonDetail = {
  id: string;
  title: string;
  description: string;
  xp: number;
  course_id: string;
  unit_id: string;
  questions: Question[];
};

export type CheckResult = 'correct' | 'incorrect' | 'invalid';

export type CheckResponse = {
  result: CheckResult;
  message: string | null;
  correct_answer: string | null;
  correct_choice: number | null;
  explanation: string | null;
};

// --- Accounts & progress ------------------------------------------------------------------

export type User = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_guest: boolean;
  timezone: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: User;
};

export type LessonProgress = {
  times_completed: number;
  best_accuracy: number; // 0..1, share of questions right on the first try
  last_completed_at: string;
};

export type Progress = {
  total_xp: number;
  streak: number;
  today: string; // YYYY-MM-DD in the student's timezone
  week: { date: string; xp: number }[];
  lessons: Record<string, LessonProgress>;
};

export type LessonSessionStart = { session_id: string; lesson_id: string };

export type Reward = {
  xp_earned: number;
  perfect_bonus: number;
  accuracy: number;
  streak: number;
  streak_extended: boolean;
  first_completion: boolean;
  total_xp: number;
};
