// עזרי טסטים לקומפוננטות: איפוס ה-stores (סינגלטונים) וטעינת מסמכי המבחן.

import { loadExams } from '../../src/data/examLoader';
import { getDefaultIssueId, getDefaultWeekForIssue, getWeek } from '../../src/data/localData';
import { answersStore } from '../../src/state/answersStore';
import { appStore } from '../../src/state/appStore';
import { DEFAULT_SETTINGS, settingsStore } from '../../src/state/settingsStore';
import type { AnswerRecord, ScheduleWeek, SettingsState } from '../../src/data/types';

let examsReady = false;

/** ממיר את מסמכי ה-Word פעם אחת לכל תהליך טסט (דורש טיימרים אמיתיים). */
export async function prepareExams(): Promise<void> {
  if (!examsReady) {
    await loadExams();
    examsReady = true;
  }
}

export function resetStores(settings: Partial<SettingsState> = {}): void {
  settingsStore.set({ loaded: true, settings: { ...DEFAULT_SETTINGS, ...settings } });
  answersStore.set({
    loaded: true,
    answers: { schemaVersion: 2, updatedAt: '', answersByWeek: {} },
    saveStatus: 'saved',
  });
  const issueId = getDefaultIssueId();
  appStore.set({
    booted: true,
    screen: 'schedule',
    activeIssueId: issueId,
    activeWeekId: getDefaultWeekForIssue(issueId)?.weekId ?? null,
    settingsOpen: false,
    isNarrow: false,
  });
}

/** כותב תשובה לשבוע ישירות ל-store (בלי לעבור דרך autosave). */
export function seedAnswer(weekId: string, over: Partial<AnswerRecord> = {}): void {
  answersStore.set((prev) => ({
    answers: {
      ...prev.answers,
      answersByWeek: {
        ...prev.answers.answersByWeek,
        [weekId]: {
          issueId: weekId.replace(/-w\d+$/, ''),
          weekId,
          answerHtml: '<p>תשובה</p>',
          answerText: 'תשובה',
          status: 'draft',
          wordCount: 1,
          lastSavedAt: '2026-01-01T00:00:00.000Z',
          ...over,
        },
      },
    },
  }));
}

/** שבוע אמיתי מתוך ה-schedule (ברירת מחדל: השבוע הראשון של גליון ר"מ). */
export function realWeek(weekId = 'issue-0240-w1'): ScheduleWeek {
  const week = getWeek(weekId);
  if (!week) throw new Error(`week ${weekId} not found`);
  return week;
}
