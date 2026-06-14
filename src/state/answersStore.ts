import { createStore } from './createStore';
import { STORAGE_KEYS, storageGet, storageSet } from '../otzaria/storage';
import { settingsStore } from './settingsStore';
import {
  type AnswerRecord,
  type AnswersState,
  type AnswerStatus,
  type ScheduleWeek,
} from '../data/types';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

interface AnswersStoreState {
  loaded: boolean;
  answers: AnswersState;
  saveStatus: SaveStatus;
}

const emptyAnswers: AnswersState = {
  schemaVersion: 2,
  updatedAt: '',
  answersByWeek: {},
};

export const answersStore = createStore<AnswersStoreState>({
  loaded: false,
  answers: emptyAnswers,
  saveStatus: 'saved',
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadAnswers(): Promise<void> {
  const saved = await storageGet<AnswersState>(STORAGE_KEYS.answers);
  answersStore.set({
    loaded: true,
    answers: saved && saved.answersByWeek ? saved : emptyAnswers,
    saveStatus: 'saved',
  });
}

export function getAnswer(weekId: string): AnswerRecord | undefined {
  return answersStore.get().answers.answersByWeek[weekId];
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

async function doSave(): Promise<void> {
  answersStore.set({ saveStatus: 'saving' });
  try {
    const state = answersStore.get().answers;
    const toSave: AnswersState = { ...state, updatedAt: new Date().toISOString() };
    await storageSet(STORAGE_KEYS.answers, toSave);
    answersStore.set({ answers: toSave, saveStatus: 'saved' });
  } catch {
    answersStore.set({ saveStatus: 'error' });
  }
}

/** שמירה מיידית (מעבר שבוע/מסך, beforeunload). */
export async function saveAnswersNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (answersStore.get().saveStatus !== 'saved') {
    await doSave();
  }
}

function scheduleSave(): void {
  answersStore.set({ saveStatus: 'unsaved' });
  if (saveTimer) clearTimeout(saveTimer);
  const ms = settingsStore.get().settings.autosaveMs || 1500;
  saveTimer = setTimeout(() => {
    void doSave();
  }, ms);
}

function upsert(week: ScheduleWeek, patch: Partial<AnswerRecord>): void {
  answersStore.set((prev) => {
    const existing = prev.answers.answersByWeek[week.weekId];
    const base: AnswerRecord = existing ?? {
      issueId: week.issueId,
      weekId: week.weekId,
      answerHtml: '',
      answerText: '',
      status: 'empty',
      wordCount: 0,
      lastSavedAt: '',
    };
    const next: AnswerRecord = { ...base, ...patch, lastSavedAt: new Date().toISOString() };
    return {
      answers: {
        ...prev.answers,
        answersByWeek: { ...prev.answers.answersByWeek, [week.weekId]: next },
      },
    };
  });
}

/** עדכון תוכן תשובת השבוע. הסטטוס עובר ל-draft אם היה empty ויש תוכן. */
export function updateAnswerContent(week: ScheduleWeek, answerHtml: string, answerText: string): void {
  const existing = getAnswer(week.weekId);
  const hasContent = answerText.trim().length > 0;
  let status: AnswerStatus = existing?.status ?? 'empty';
  if (status !== 'completed') status = hasContent ? 'draft' : 'empty';
  upsert(week, {
    answerHtml,
    answerText,
    wordCount: countWords(answerText),
    status,
  });
  scheduleSave();
}

export function setAnswerStatus(week: ScheduleWeek, status: AnswerStatus): void {
  upsert(week, { status });
  scheduleSave();
}

// ── חישוב התקדמות שבוע ──

export interface WeekProgress {
  status: 'not-started' | 'draft' | 'completed' | 'missing-data';
  wordCount: number;
}

/** סטטוס השבוע לפי תשובת השבוע היחידה. hasExam=false → missing-data. */
export function computeWeekProgress(week: ScheduleWeek, hasExam: boolean): WeekProgress {
  if (!hasExam) return { status: 'missing-data', wordCount: 0 };
  const rec = answersStore.get().answers.answersByWeek[week.weekId];
  const status =
    rec?.status === 'completed' ? 'completed' : rec?.status === 'draft' ? 'draft' : 'not-started';
  return { status, wordCount: rec?.wordCount ?? 0 };
}

export function useAnswersState(): AnswersStoreState {
  return answersStore.use((s) => s);
}

export function useSaveStatus(): SaveStatus {
  return answersStore.use((s) => s.saveStatus);
}
