import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import type { AnswersState } from '../../src/data/types';
import { makeWeek } from '../helpers/fixtures';

type AnswersModule = typeof import('../../src/state/answersStore');

async function freshAnswers(): Promise<AnswersModule> {
  vi.resetModules();
  return await import('../../src/state/answersStore');
}

let host: FakeHost;

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
});

afterEach(() => {
  vi.useRealTimers();
});

const week = makeWeek();
const savedValue = () => host.callsTo('storage.set').at(-1)!.payload.value as AnswersState;

describe('loadAnswers', () => {
  it('ללא נתונים שמורים — מצב ריק, loaded=true', async () => {
    const mod = await freshAnswers();
    await mod.loadAnswers();
    const state = mod.answersStore.get();
    expect(state.loaded).toBe(true);
    expect(state.answers).toEqual({ schemaVersion: 2, updatedAt: '', answersByWeek: {} });
    expect(state.saveStatus).toBe('saved');
  });

  it('טוען תשובות שמורות', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'answers:v2',
      value: {
        schemaVersion: 2,
        updatedAt: '2026-01-01T00:00:00.000Z',
        answersByWeek: {
          [week.weekId]: {
            issueId: week.issueId,
            weekId: week.weekId,
            answerHtml: '<p>שמור</p>',
            answerText: 'שמור',
            status: 'draft',
            wordCount: 1,
            lastSavedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      } as never,
    });
    const mod = await freshAnswers();
    await mod.loadAnswers();
    expect(mod.getAnswer(week.weekId)?.answerText).toBe('שמור');
  });

  it('נתון שמור פגום (ללא answersByWeek) נופל למצב ריק', async () => {
    await window.Otzaria.call('storage.set', { key: 'answers:v2', value: { junk: true } as never });
    const mod = await freshAnswers();
    await mod.loadAnswers();
    expect(mod.answersStore.get().answers.answersByWeek).toEqual({});
  });
});

describe('updateAnswerContent', () => {
  it('יוצר רשומה חדשה עם סטטוס draft וספירת מילים', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>שלוש מילים כאן</p>', 'שלוש מילים כאן');
    const rec = mod.getAnswer(week.weekId)!;
    expect(rec.status).toBe('draft');
    expect(rec.wordCount).toBe(3);
    expect(rec.answerHtml).toBe('<p>שלוש מילים כאן</p>');
    expect(rec.issueId).toBe(week.issueId);
    expect(rec.lastSavedAt).not.toBe('');
  });

  it('תוכן ריק מחזיר את הסטטוס ל-empty עם 0 מילים', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>טקסט</p>', 'טקסט');
    mod.updateAnswerContent(week, '', '   ');
    const rec = mod.getAnswer(week.weekId)!;
    expect(rec.status).toBe('empty');
    expect(rec.wordCount).toBe(0);
  });

  it('סטטוס "הושלם" נשמר גם בעריכה נוספת', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    mod.setAnswerStatus(week, 'completed');
    mod.updateAnswerContent(week, '<p>א ב</p>', 'א ב');
    expect(mod.getAnswer(week.weekId)?.status).toBe('completed');
  });

  it('ספירת מילים מתעלמת מרווחים מרובים ושורות', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '', '  א   ב \n ג  ');
    expect(mod.getAnswer(week.weekId)?.wordCount).toBe(3);
  });

  it('שמירת שבועות שונים אינה דורסת זו את זו', async () => {
    const mod = await freshAnswers();
    const w2 = makeWeek({ weekId: 'issue-9999-w2', weekNumber: 2 });
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    mod.updateAnswerContent(w2, '<p>ב</p>', 'ב');
    expect(mod.getAnswer(week.weekId)?.answerText).toBe('א');
    expect(mod.getAnswer(w2.weekId)?.answerText).toBe('ב');
  });

  it('getAnswer מחזיר undefined לשבוע ללא תשובה', async () => {
    const mod = await freshAnswers();
    expect(mod.getAnswer('אין-כזה')).toBeUndefined();
  });
});

describe('שמירה אוטומטית', () => {
  it('מסמנת unsaved ואז שומרת לאחר autosaveMs', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    expect(mod.answersStore.get().saveStatus).toBe('unsaved');
    await vi.advanceTimersByTimeAsync(1500);
    expect(mod.answersStore.get().saveStatus).toBe('saved');
    expect(host.callsTo('storage.set')).toHaveLength(1);
    expect(savedValue().answersByWeek[week.weekId].answerText).toBe('א');
    expect(savedValue().updatedAt).not.toBe('');
  });

  it('הקלדות רצופות נשמרות בכתיבה אחת', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    await vi.advanceTimersByTimeAsync(1000);
    mod.updateAnswerContent(week, '<p>אב</p>', 'אב');
    await vi.advanceTimersByTimeAsync(1000);
    expect(host.callsTo('storage.set')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(host.callsTo('storage.set')).toHaveLength(1);
    expect(savedValue().answersByWeek[week.weekId].answerText).toBe('אב');
  });

  it('מכבדת את השהיית השמירה מההגדרות', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    const settings = await import('../../src/state/settingsStore');
    settings.updateSettings({ autosaveMs: 5000 });
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.callsTo('storage.set').filter((c) => c.payload.key === 'answers:v2')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(host.callsTo('storage.set').filter((c) => c.payload.key === 'answers:v2')).toHaveLength(1);
    settings.updateSettings({ autosaveMs: 1500 });
  });

  it('כשל שמירה מסמן סטטוס error', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    host.fail('storage.set', 'error.quota');
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    await vi.advanceTimersByTimeAsync(1500);
    expect(mod.answersStore.get().saveStatus).toBe('error');
  });

  it('setAnswerStatus מתזמן שמירה', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    mod.setAnswerStatus(week, 'completed');
    expect(mod.answersStore.get().saveStatus).toBe('unsaved');
    await vi.advanceTimersByTimeAsync(1500);
    expect(savedValue().answersByWeek[week.weekId].status).toBe('completed');
  });
});

describe('saveAnswersNow', () => {
  it('שומרת מיד ומבטלת את הטיימר', async () => {
    vi.useFakeTimers();
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    await mod.saveAnswersNow();
    expect(host.callsTo('storage.set')).toHaveLength(1);
    expect(mod.answersStore.get().saveStatus).toBe('saved');
    await vi.advanceTimersByTimeAsync(3000);
    expect(host.callsTo('storage.set')).toHaveLength(1);
  });

  it('אינה שומרת כשאין שינוי', async () => {
    const mod = await freshAnswers();
    await mod.loadAnswers();
    await mod.saveAnswersNow();
    expect(host.callsTo('storage.set')).toHaveLength(0);
  });
});

describe('computeWeekProgress', () => {
  it('ללא מבחן — missing-data', async () => {
    const mod = await freshAnswers();
    expect(mod.computeWeekProgress(week, false)).toEqual({ status: 'missing-data', wordCount: 0 });
  });

  it('ללא תשובה — not-started', async () => {
    const mod = await freshAnswers();
    expect(mod.computeWeekProgress(week, true)).toEqual({ status: 'not-started', wordCount: 0 });
  });

  it('תשובה בטיוטה — draft עם ספירת מילים', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א ב</p>', 'א ב');
    expect(mod.computeWeekProgress(week, true)).toEqual({ status: 'draft', wordCount: 2 });
  });

  it('תשובה שהושלמה — completed', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    mod.setAnswerStatus(week, 'completed');
    expect(mod.computeWeekProgress(week, true).status).toBe('completed');
  });

  it('תשובה שרוקנה — not-started', async () => {
    const mod = await freshAnswers();
    mod.updateAnswerContent(week, '<p>א</p>', 'א');
    mod.updateAnswerContent(week, '', '');
    expect(mod.computeWeekProgress(week, true).status).toBe('not-started');
  });
});

describe('hooks', () => {
  it('useSaveStatus ו-useAnswersState מתעדכנים', async () => {
    const mod = await freshAnswers();
    const { renderHook, act } = await import('@testing-library/react');
    const status = renderHook(() => mod.useSaveStatus());
    const state = renderHook(() => mod.useAnswersState());
    expect(status.result.current).toBe('saved');
    act(() => mod.updateAnswerContent(week, '<p>א</p>', 'א'));
    expect(status.result.current).toBe('unsaved');
    expect(state.result.current.answers.answersByWeek[week.weekId].answerText).toBe('א');
  });
});
