import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { defaultHandlers, installFakeHost } from '../helpers/host';
import { getDefaultIssueId, getDefaultWeekForIssue, getWeeksForIssue } from '../../src/data/localData';

type AppModule = typeof import('../../src/state/appStore');
type SettingsModule = typeof import('../../src/state/settingsStore');

async function freshApp(): Promise<{ app: AppModule; settings: SettingsModule }> {
  vi.resetModules();
  const settings = await import('../../src/state/settingsStore');
  const app = await import('../../src/state/appStore');
  return { app, settings };
}

beforeEach(() => {
  installFakeHost(defaultHandlers());
});

describe('מצב התחלתי', () => {
  it('מתחיל במסך ההספקים, בגליון ובשבוע ברירת המחדל, לא booted', async () => {
    const { app } = await freshApp();
    const state = app.appStore.get();
    expect(state.booted).toBe(false);
    expect(state.screen).toBe('schedule');
    expect(state.activeIssueId).toBe(getDefaultIssueId());
    expect(state.activeWeekId).toBe(getDefaultWeekForIssue(getDefaultIssueId())?.weekId);
    expect(state.settingsOpen).toBe(false);
    expect(state.isNarrow).toBe(false);
  });
});

describe('ניווט', () => {
  it('setBooted מסמן שהאפליקציה עלתה', async () => {
    const { app } = await freshApp();
    app.setBooted();
    expect(app.appStore.get().booted).toBe(true);
  });

  it('goToScreen מחליף מסך בלי לשנות שבוע', async () => {
    const { app } = await freshApp();
    const weekBefore = app.appStore.get().activeWeekId;
    app.goToScreen('questions');
    expect(app.appStore.get().screen).toBe('questions');
    expect(app.appStore.get().activeWeekId).toBe(weekBefore);
    app.goToScreen('workspace');
    expect(app.appStore.get().screen).toBe('workspace');
  });

  it('openWorkspace עובר לכתיבה על שבוע ושומר בהגדרות', async () => {
    const { app, settings } = await freshApp();
    app.openWorkspace('issue-0240-w3');
    expect(app.appStore.get()).toMatchObject({ screen: 'workspace', activeWeekId: 'issue-0240-w3' });
    expect(settings.settingsStore.get().settings.lastOpenWeekId).toBe('issue-0240-w3');
  });

  it('openQuestionsScreen עובר למבחן ושומר את השבוע', async () => {
    const { app, settings } = await freshApp();
    app.openQuestionsScreen('issue-0240-w2');
    expect(app.appStore.get()).toMatchObject({ screen: 'questions', activeWeekId: 'issue-0240-w2' });
    expect(settings.settingsStore.get().settings.lastOpenWeekId).toBe('issue-0240-w2');
  });

  it('selectWeek מחליף שבוע בלי להחליף מסך', async () => {
    const { app, settings } = await freshApp();
    app.goToScreen('questions');
    app.selectWeek('issue-0240-w4');
    expect(app.appStore.get().screen).toBe('questions');
    expect(app.appStore.get().activeWeekId).toBe('issue-0240-w4');
    expect(settings.settingsStore.get().settings.lastOpenWeekId).toBe('issue-0240-w4');
  });
});

describe('setActiveIssue', () => {
  it('מעבר גליון מאפס לשבוע הראשון וחוזר למסך ההספקים', async () => {
    const { app, settings } = await freshApp();
    app.openWorkspace('issue-0242-w3');
    app.setActiveIssue('issue-0240');
    const state = app.appStore.get();
    expect(state.activeIssueId).toBe('issue-0240');
    expect(state.activeWeekId).toBe(getWeeksForIssue('issue-0240')[0].weekId);
    expect(state.screen).toBe('schedule');
    expect(settings.settingsStore.get().settings.lastOpenIssueId).toBe('issue-0240');
    expect(settings.settingsStore.get().settings.lastOpenWeekId).toBe('issue-0240-w1');
  });

  it('גליון בלי שבועות מאפס את השבוע ל-null', async () => {
    const { app, settings } = await freshApp();
    app.setActiveIssue('issue-0000');
    expect(app.appStore.get().activeWeekId).toBeNull();
    expect(settings.settingsStore.get().settings.lastOpenWeekId).toBe('');
  });

  it('כל הגליונות מ-manifest ניתנים לבחירה ומייצרים שבוע פעיל', async () => {
    const { app } = await freshApp();
    const { examsManifest } = await import('../../src/data/localData');
    for (const exam of examsManifest.exams) {
      app.setActiveIssue(exam.issueId);
      expect(app.appStore.get().activeWeekId, exam.issueId).toBe(`${exam.issueId}-w1`);
    }
  });
});

describe('הגדרות ורוחב מסך', () => {
  it('setSettingsOpen פותח וסוגר', async () => {
    const { app } = await freshApp();
    app.setSettingsOpen(true);
    expect(app.appStore.get().settingsOpen).toBe(true);
    app.setSettingsOpen(false);
    expect(app.appStore.get().settingsOpen).toBe(false);
  });

  it('setIsNarrow מעדכן רק כשהערך משתנה', async () => {
    const { app } = await freshApp();
    const listener = vi.fn();
    app.appStore.subscribe(listener);
    app.setIsNarrow(false);
    expect(listener).not.toHaveBeenCalled();
    app.setIsNarrow(true);
    expect(listener).toHaveBeenCalledOnce();
    app.setIsNarrow(true);
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('useApp', () => {
  it('מחזיר את המצב ומתעדכן בשינוי', async () => {
    const { app } = await freshApp();
    const { result } = renderHook(() => app.useApp());
    expect(result.current.screen).toBe('schedule');
    act(() => app.goToScreen('workspace'));
    expect(result.current.screen).toBe('workspace');
  });
});
