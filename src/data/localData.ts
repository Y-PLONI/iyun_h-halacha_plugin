// טעינת הנתונים המקומיים. הקבצים מיובאים ישירות (bundled) כדי להבטיח טעינה
// גם ללא רשת וללא fetch. הקבצים נשארים גם כקבצים עצמאיים תחת dist/data/* (publicDir)
// לצורך תחזוקה.

import scheduleJson from '../../public/data/schedule.json';
import examsManifestJson from '../../public/data/exams-manifest.json';
import issue0240 from '../../public/data/questions/issue-0240.json';

import type {
  ExamEntry,
  ExamsManifest,
  Question,
  QuestionsFile,
  Schedule,
  ScheduleWeek,
} from './types';

// מסמכי המבחן נטענים בזמן ריצה ישירות מ-exams-src/*.docx (ראה examLoader).
export { getExamDoc, getExamWeek, loadExams } from './examLoader';

export const schedule = scheduleJson as Schedule;
export const examsManifest = examsManifestJson as ExamsManifest;

// מיפוי issueId -> קובץ שאלות (legacy/ולידציה). תצוגת השאלות מגיעה ממסמך ה-Word.
const questionsByIssue: Record<string, QuestionsFile> = {
  'issue-0240': issue0240 as unknown as QuestionsFile,
};

export function getQuestionsFile(issueId: string): QuestionsFile | null {
  return questionsByIssue[issueId] ?? null;
}

export function getAllWeeks(): ScheduleWeek[] {
  return schedule.periods.flatMap((p) => p.weeks);
}

export function getWeek(weekId: string): ScheduleWeek | null {
  return getAllWeeks().find((w) => w.weekId === weekId) ?? null;
}

/** רשימת הגליונות לבחירה (מה-manifest), ממוין לפי מספר גליון יורד. */
export function getIssues(): ExamEntry[] {
  return [...examsManifest.exams].sort((a, b) => b.issueNumber - a.issueNumber);
}

export function getExamMeta(issueId: string): ExamEntry | null {
  return examsManifest.exams.find((e) => e.issueId === issueId) ?? null;
}

/** כל השבועות של גליון נתון, לפי הסדר. */
export function getWeeksForIssue(issueId: string): ScheduleWeek[] {
  return getAllWeeks()
    .filter((w) => w.issueId === issueId)
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

/** הגליון ההתחלתי: defaultIssueId אם קיים, אחרת הגבוה ביותר. */
export function getDefaultIssueId(): string {
  const ids = new Set(examsManifest.exams.map((e) => e.issueId));
  if (schedule.defaultIssueId && ids.has(schedule.defaultIssueId)) return schedule.defaultIssueId;
  return getIssues()[0]?.issueId ?? schedule.defaultIssueId;
}

/** השבוע ההתחלתי בגליון: ה-'active' הראשון, אחרת הראשון. */
export function getDefaultWeekForIssue(issueId: string): ScheduleWeek | null {
  const weeks = getWeeksForIssue(issueId);
  return weeks.find((w) => w.status === 'active') ?? weeks[0] ?? null;
}

export function getDefaultWeek(): ScheduleWeek | null {
  return getDefaultWeekForIssue(getDefaultIssueId());
}

/** כל השאלות של שבוע נתון, בסדר. מחזיר [] אם אין קובץ שאלות. */
export function getQuestionsForWeek(week: ScheduleWeek): Question[] {
  const file = getQuestionsFile(week.issueId);
  if (!file) return [];
  const qWeek = file.weeks.find((w) => w.weekId === week.weekId);
  if (!qWeek) return [];
  // משמרים את סדר questionIds מ-schedule כשהוא קיים, אחרת order
  const byId = new Map(qWeek.questions.map((q) => [q.questionId, q]));
  if (week.questionIds.length) {
    return week.questionIds.map((id) => byId.get(id)).filter((q): q is Question => !!q);
  }
  return [...qWeek.questions].sort((a, b) => a.order - b.order);
}

export function getQuestion(week: ScheduleWeek, questionId: string): Question | null {
  return getQuestionsForWeek(week).find((q) => q.questionId === questionId) ?? null;
}

export function hasQuestionsData(week: ScheduleWeek): boolean {
  return getQuestionsForWeek(week).length > 0;
}
