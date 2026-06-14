import { createStore } from './createStore';
import { STORAGE_KEYS, storageGet, storageSet } from '../otzaria/storage';
import { settingsStore } from './settingsStore';
import {
  answerKey,
  type AnswerRecord,
  type AnswersState,
  type AnswerStatus,
  type Question,
  type ScheduleWeek,
} from '../data/types';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

interface AnswersStoreState {
  loaded: boolean;
  answers: AnswersState;
  saveStatus: SaveStatus;
}

const emptyAnswers: AnswersState = {
  schemaVersion: 1,
  updatedAt: '',
  answersByQuestion: {},
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
    answers: saved && saved.answersByQuestion ? saved : emptyAnswers,
    saveStatus: 'saved',
  });
}

export function getAnswer(issueId: string, questionId: string): AnswerRecord | undefined {
  return answersStore.get().answers.answersByQuestion[answerKey(issueId, questionId)];
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

/** שמירה מיידית (מעבר שאלה/מסך, beforeunload). */
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

function upsert(
  week: ScheduleWeek,
  question: Question,
  patch: Partial<AnswerRecord>,
): void {
  const key = answerKey(week.issueId, question.questionId);
  answersStore.set((prev) => {
    const existing = prev.answers.answersByQuestion[key];
    const base: AnswerRecord = existing ?? {
      issueId: week.issueId,
      weekId: week.weekId,
      questionId: question.questionId,
      answerHtml: '',
      answerText: '',
      status: 'empty',
      wordCount: 0,
      lastSavedAt: '',
      sourceLinks: [],
    };
    const next: AnswerRecord = { ...base, ...patch, lastSavedAt: new Date().toISOString() };
    return {
      answers: {
        ...prev.answers,
        answersByQuestion: { ...prev.answers.answersByQuestion, [key]: next },
      },
    };
  });
}

/** עדכון תוכן תשובה. הסטטוס עובר ל-draft אם היה empty ויש תוכן. */
export function updateAnswerContent(
  week: ScheduleWeek,
  question: Question,
  answerHtml: string,
  answerText: string,
): void {
  const existing = getAnswer(week.issueId, question.questionId);
  const hasContent = answerText.trim().length > 0;
  let status: AnswerStatus = existing?.status ?? 'empty';
  if (status !== 'completed') status = hasContent ? 'draft' : 'empty';
  upsert(week, question, {
    answerHtml,
    answerText,
    wordCount: countWords(answerText),
    status,
  });
  scheduleSave();
}

export function setAnswerStatus(week: ScheduleWeek, question: Question, status: AnswerStatus): void {
  upsert(week, question, { status });
  scheduleSave();
}

// ── חישוב התקדמות שבוע ──

export interface WeekProgress {
  total: number;
  completed: number;
  draft: number;
  status: 'not-started' | 'draft' | 'completed' | 'missing-data';
}

export function computeWeekProgress(week: ScheduleWeek, questionCount: number): WeekProgress {
  if (questionCount === 0) {
    return { total: 0, completed: 0, draft: 0, status: 'missing-data' };
  }
  const map = answersStore.get().answers.answersByQuestion;
  let completed = 0;
  let draft = 0;
  for (const qid of week.questionIds) {
    const rec = map[answerKey(week.issueId, qid)];
    if (!rec) continue;
    if (rec.status === 'completed') completed++;
    else if (rec.status === 'draft') draft++;
  }
  let status: WeekProgress['status'] = 'not-started';
  if (completed >= week.requiredAnswersCount && completed > 0) status = 'completed';
  else if (completed > 0 || draft > 0) status = 'draft';
  return { total: questionCount, completed, draft, status };
}

export function useAnswersState(): AnswersStoreState {
  return answersStore.use((s) => s);
}

export function useSaveStatus(): SaveStatus {
  return answersStore.use((s) => s.saveStatus);
}
