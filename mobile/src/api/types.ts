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
