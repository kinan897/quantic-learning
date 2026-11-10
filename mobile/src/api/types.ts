/** Mirrors the backend's public schemas (backend/app/schemas.py). */

export type LessonKind = 'learn' | 'practice' | 'destroyer';

export type LessonSummary = {
  id: string;
  kind: LessonKind;
  topic: string | null;
  title: string;
  description: string;
  xp: number;
  question_count: number;
  card_count: number;
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
  /** Filter tab on the Courses screen, matching the website. */
  category: CourseCategory;
  grade: number | null;
  grade_label: string;
  status: 'available' | 'coming_soon';
  description: string;
  unit_count: number;
  lesson_count: number;
};

export type CourseCategory = 'junior' | 'math' | 'science' | 'english' | 'uni';

export type CourseDetail = CourseSummary & {
  prerequisites: string[];
  units: Unit[];
};

// --- Visual blocks ------------------------------------------------------------------------

export type GraphColor = 'primary' | 'accent' | 'success' | 'error' | 'warning' | 'muted';
export type XY = [number, number];

/** A graph, already sampled into points by the server. */
export type GraphData = {
  type: 'graph';
  x: XY;
  y: XY;
  x_label: string;
  y_label: string;
  grid: boolean;
  aspect: number; // height / width
  curves: { color: GraphColor; label: string | null; dashed: boolean; paths: XY[][] }[];
  segments: {
    start: XY;
    end: XY;
    color: GraphColor;
    label: string | null;
    dashed: boolean;
    arrow: boolean;
  }[];
  points: { at: XY; label: string | null; color: GraphColor; open: boolean }[];
  caption: string | null;
};

export type ImageData = {
  type: 'image';
  url: string; // relative to the API host
  alt: string;
  aspect: number;
  caption: string | null;
};

export type TextBlock = { type: 'text'; md: string };
export type CalloutBlock = {
  type: 'callout';
  tone: 'key' | 'tip' | 'warning';
  title: string | null;
  md: string;
};

export type Block = TextBlock | CalloutBlock | GraphData | ImageData;
export type Figure = GraphData | ImageData;

// --- Lesson items -------------------------------------------------------------------------

export type TeachCard = {
  id: string;
  type: 'teach';
  title: string;
  blocks: Block[];
};

export type MultipleChoiceQuestion = {
  id: string;
  type: 'multiple_choice';
  prompt: string;
  figure: Figure | null;
  hint: string | null;
  choices: (string | GraphData)[];
};

export type MathInputQuestion = {
  id: string;
  type: 'math_input';
  prompt: string;
  figure: Figure | null;
  hint: string | null;
  variables: string[];
  placeholder: string | null;
};

export type Question = MultipleChoiceQuestion | MathInputQuestion;
export type LessonItem = TeachCard | Question;

export type LessonDetail = {
  id: string;
  kind: LessonKind;
  topic: string | null;
  title: string;
  description: string;
  xp: number;
  course_id: string;
  course_code: string;
  unit_id: string;
  items: LessonItem[];
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
