// בוני נתונים לטסטים: שבועות/הספק/קבצי שאלות/HTML של מסמך מבחן.

import type {
  ExamsManifest,
  QuestionsFile,
  Schedule,
  ScheduleWeek,
  SettingsState,
} from '../../src/data/types';
import { DEFAULT_SETTINGS } from '../../src/state/settingsStore';

export function makeWeek(over: Partial<ScheduleWeek> = {}): ScheduleWeek {
  return {
    weekId: 'issue-9999-w1',
    issueId: 'issue-9999',
    weekNumber: 1,
    weeksInIssue: 4,
    parasha: 'שלח לך',
    title: 'שבוע פרשת שלח לך',
    topicTitle: 'דיני ציצית',
    hebrewDateRange: 'כ"ה סיון - ב\' תמוז',
    gregorianDateRange: { start: '2026-06-10', end: '2026-06-17' },
    sourceRangeTitle: 'מסימן תקלט עד סימן תקמב',
    sourceRefs: {
      shulchanAruch: { startRef: 'סימן תקלט', endRef: 'סימן תקמב' },
      mishnaBerurah: { startRef: 'סימן תקלט', endRef: 'סימן תקמב' },
      biurHalacha: { startRef: 'סימן תקלט' },
    },
    questionIds: [],
    requiredAnswersCount: 0,
    totalQuestionsCount: 0,
    status: 'active',
    ...over,
  };
}

export function makeSchedule(over: Partial<Schedule> = {}): Schedule {
  return {
    schemaVersion: 1,
    dataVersion: '2026.01.01',
    updatedAt: '2026-01-01T00:00:00.000Z',
    defaultIssueId: 'issue-9999',
    periods: [
      {
        periodId: 'p1',
        title: 'תקופה',
        hebrewMonthRange: 'סיון',
        gregorianRange: { start: '2026-06-01', end: '2026-06-30' },
        issueIds: ['issue-9999'],
        weeks: [makeWeek(), makeWeek({ weekId: 'issue-9999-w2', weekNumber: 2, parasha: 'קרח' })],
      },
    ],
    ...over,
  };
}

export function makeQuestionsFile(over: Partial<QuestionsFile> = {}): QuestionsFile {
  return {
    schemaVersion: 1,
    issueId: 'issue-9999',
    issueNumber: 9999,
    title: 'גליון בדיקה',
    hebrewMonth: 'סיון',
    weeks: [
      {
        weekId: 'issue-9999-w1',
        weekNumber: 1,
        parasha: 'שלח לך',
        headerText: 'שבוע פרשת שלח לך',
        sourceRangeTitle: 'מסימן תקלט',
        questions: [
          { questionId: 'q1', order: 1, letter: 'א', title: 'שאלה ראשונה', body: 'גוף' },
          { questionId: 'q2', order: 2, letter: 'ב', title: 'שאלה שניה', body: 'גוף' },
        ],
      },
    ],
    ...over,
  };
}

export function makeExamsManifest(over: Partial<ExamsManifest> = {}): ExamsManifest {
  return {
    schemaVersion: 1,
    dataVersion: '2026.01.01',
    updatedAt: '2026-01-01T00:00:00.000Z',
    exams: [
      {
        issueId: 'issue-9999',
        issueNumber: 9999,
        title: 'עיון ההלכה - גליון בדיקה',
        hebrewMonth: 'סיון',
        weeksInIssue: 2,
        parshiot: ['שלח לך', 'קרח'],
        version: '1',
        updatedAt: '2026-01-01T00:00:00.000Z',
        files: { questionsJson: null, pdf: null, docx: 'issue-9999.docx' },
        sha256: { questionsJson: '', pdf: '' },
        licenseStatus: 'private',
        notes: '',
      },
    ],
    ...over,
  };
}

export function makeSettings(over: Partial<SettingsState> = {}): SettingsState {
  return { ...DEFAULT_SETTINGS, ...over };
}

/** בונה HTML בסגנון הפלט של mammoth (רק <p>, עם <strong> אופציונלי). */
export function mammothHtml(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${p}</p>`).join('');
}

/** מסמך מבחן מלא (שני שבועות) בפורמט שגליונות עיון ההלכה משתמשים בו. */
export function examDocHtml(): string {
  return mammothHtml([
    'בס"ד',
    'עיון ההלכה - גליון בדיקה',
    'סיון תשפ"ו',
    'שם:',
    'קוד אישי: ______',
    '(שבוע 1 מתוך 2)',
    'שבוע פרשת שלח לך - דיני ציצית',
    'מסימן תקלט עד סימן תקמ',
    '<strong>א] כיסוי הראש</strong> - א, האם מותר?',
    'ב, ומה הדין בשבת?',
    '<strong>ב] ברכת הציצית</strong>',
    'א, מאימתי מברכים?',
    '-------------------',
    'עיון ההלכה - גליון בדיקה',
    'סיון תשפ"ו',
    '(שבוע 2 מתוך 2)',
    'שבוע קרח',
    'מסי\' תקמא',
    '<strong>א] קריאת התורה</strong>',
    'א, כמה עולים?',
  ]);
}
