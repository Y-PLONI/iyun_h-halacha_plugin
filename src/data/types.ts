// ── טיפוסי נתונים משותפים לתוסף "עיון ההלכה" ──
// מבנה היררכי: גליון (issue) -> שבוע (week) -> מקורות + שאלות -> תשובות

/** מזהי הספרים מאוצריא, לפי תפקיד. שמות בפועל ניתנים ל-override בהגדרות. */
export type SourceRole =
  | 'shulchanAruch'
  | 'mishnaBerurah'
  | 'biurHalacha'
  | 'shaarHatziyun';

export const SOURCE_ROLES: SourceRole[] = [
  'shulchanAruch',
  'mishnaBerurah',
  'biurHalacha',
  'shaarHatziyun',
];

export const SOURCE_ROLE_LABELS: Record<SourceRole, string> = {
  shulchanAruch: 'שולחן ערוך',
  mishnaBerurah: 'משנה ברורה',
  biurHalacha: 'ביאור הלכה',
  shaarHatziyun: 'שער הציון',
};

export interface SourceRef {
  /** שם הספר כפי שאוצריא מחזירה מ-library.findBooks (אופציונלי בשאלה) */
  bookId?: string;
  startRef: string;
  endRef?: string;
}

export type WeekSourceRefs = Partial<Record<SourceRole, SourceRef>>;

// ── schedule.json ──

export interface ScheduleWeek {
  weekId: string;
  issueId: string;
  weekNumber: number;
  weeksInIssue: number;
  parasha: string;
  title: string;
  topicTitle: string;
  hebrewDateRange: string;
  gregorianDateRange: { start: string; end: string };
  sourceRangeTitle: string;
  sourceRefs: WeekSourceRefs;
  questionIds: string[];
  requiredAnswersCount: number;
  totalQuestionsCount: number;
  status: 'active' | 'upcoming' | 'past';
}

export interface SchedulePeriod {
  periodId: string;
  title: string;
  hebrewMonthRange: string;
  gregorianRange: { start: string; end: string };
  issueIds: string[];
  weeks: ScheduleWeek[];
}

export interface Schedule {
  schemaVersion: 1;
  dataVersion: string;
  updatedAt: string;
  defaultIssueId: string;
  periods: SchedulePeriod[];
}

// ── exams-manifest.json ──

export type LicenseStatus = 'authorized' | 'private' | 'userProvided';

export interface ExamEntry {
  issueId: string;
  issueNumber: number;
  title: string;
  hebrewMonth: string;
  weeksInIssue: number;
  parshiot: string[];
  version: string;
  updatedAt: string;
  files: {
    questionsJson: string | null;
    pdf: string | null;
    docx: string | null;
  };
  sha256: { questionsJson: string; pdf: string };
  licenseStatus: LicenseStatus;
  notes: string;
}

export interface ExamsManifest {
  schemaVersion: 1;
  dataVersion: string;
  updatedAt: string;
  exams: ExamEntry[];
}

// ── questions/issue-XXXX.json ──

export interface QuestionPart {
  partId: string;
  label: string;
  text: string;
}

export interface Question {
  questionId: string;
  order: number;
  letter: string;
  title: string;
  body: string;
  parts?: QuestionPart[];
  sourceRefs?: Partial<Record<SourceRole, SourceRef>>;
  tags?: string[];
}

export interface QuestionsWeek {
  weekId: string;
  weekNumber: number;
  parasha: string;
  headerText: string;
  sourceRangeTitle: string;
  questions: Question[];
}

export interface QuestionsFile {
  schemaVersion: 1;
  issueId: string;
  issueNumber: number;
  title: string;
  hebrewMonth: string;
  weeks: QuestionsWeek[];
}

// ── מסמך מבחן מומר מ-Word (public/data/exams/issue-XXXX.json) ──
// נבנה ב-scripts/convert-exams.ts. משמש לתצוגת המבחן (קריאה בלבד) בחלונית הימנית.

export interface ExamWeekDoc {
  weekNumber: number;
  parasha: string;
  title: string;
  sourceRangeTitle: string;
  /** HTML מנוקה: טווח סימנים + שאלות (exam-q / exam-sub) */
  html: string;
}

export interface ExamDoc {
  schemaVersion: 1;
  issueId: string;
  issueTitle: string;
  hebrewMonth: string;
  sourceFile: string;
  weeks: ExamWeekDoc[];
}

// ── תשובות המשתמש (storage: answers:v2) ──
// מודל תשובה חופשית אחת לכל שבוע (לא לכל שאלה). המבחן מוצג כקריאה בלבד.

export type AnswerStatus = 'empty' | 'draft' | 'completed';

export interface AnswerRecord {
  issueId: string;
  weekId: string;
  answerHtml: string;
  answerText: string;
  status: AnswerStatus;
  wordCount: number;
  lastSavedAt: string;
}

export interface AnswersState {
  schemaVersion: 2;
  updatedAt: string;
  /** מפתח: weekId (ייחודי גלובלית, למשל issue-0240-w1) */
  answersByWeek: Record<string, AnswerRecord>;
}

// ── הגדרות המשתמש (storage: settings:v1) ──

export interface SettingsState {
  schemaVersion: 1;
  name: string;
  personalCode: string;
  senderEmail: string;
  recipientEmail: string;
  bookIds: Record<SourceRole, string>;
  autosaveMs: number;
  sourcePaneMode: 'one' | 'three';
  lastOpenIssueId: string;
  lastOpenWeekId: string;
}

