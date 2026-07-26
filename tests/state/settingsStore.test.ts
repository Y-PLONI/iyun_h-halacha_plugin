import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import type { SettingsState } from '../../src/data/types';

type SettingsModule = typeof import('../../src/state/settingsStore');

async function freshSettings(): Promise<SettingsModule> {
  vi.resetModules();
  return await import('../../src/state/settingsStore');
}

let host: FakeHost;

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
});

afterEach(() => {
  vi.useRealTimers();
});

async function saveToHost(value: Partial<SettingsState>): Promise<void> {
  await window.Otzaria.call('storage.set', { key: 'settings:v1', value: value as never });
}

describe('DEFAULT_SETTINGS', () => {
  it('כולל את שמות הספרים המדויקים (עם פסיק בשו"ע)', async () => {
    const { DEFAULT_SETTINGS } = await freshSettings();
    expect(DEFAULT_SETTINGS.bookIds.shulchanAruch).toBe('שולחן ערוך, אורח חיים');
    expect(DEFAULT_SETTINGS.bookIds.mishnaBerurah).toBe('משנה ברורה');
    expect(DEFAULT_SETTINGS.bookIds.biurHalacha).toBe('ביאור הלכה');
    expect(DEFAULT_SETTINGS.bookIds.shaarHatziyun).toBe('שער הציון');
  });

  it('ברירות מחדל של תזכורות: כבוי, יום חמישי 20:00, שני הערוצים דלוקים', async () => {
    const { DEFAULT_SETTINGS } = await freshSettings();
    expect(DEFAULT_SETTINGS.remindersEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.reminderWeekday).toBe(4);
    expect(DEFAULT_SETTINGS.reminderTime).toBe('20:00');
    expect(DEFAULT_SETTINGS.desktopNotifications).toBe(true);
    expect(DEFAULT_SETTINGS.calendarReminders).toBe(true);
  });

  it('ברירות מחדל של מראה ושמירה', async () => {
    const { DEFAULT_SETTINGS } = await freshSettings();
    expect(DEFAULT_SETTINGS.fontMode).toBe('default');
    expect(DEFAULT_SETTINGS.uiFontSize).toBe(16);
    expect(DEFAULT_SETTINGS.autosaveMs).toBe(1500);
    expect(DEFAULT_SETTINGS.recipientEmail).toBe('8178002@gmail.com');
  });
});

describe('loadSettings', () => {
  it('ללא הגדרות שמורות — ברירות המחדל, loaded=true', async () => {
    const mod = await freshSettings();
    await mod.loadSettings();
    expect(mod.settingsStore.get().loaded).toBe(true);
    expect(mod.settingsStore.get().settings).toEqual(mod.DEFAULT_SETTINGS);
  });

  it('ממזג הגדרות שמורות חלקיות עם ברירות המחדל', async () => {
    await saveToHost({ name: 'ישראל', uiFontSize: 22 });
    const mod = await freshSettings();
    await mod.loadSettings();
    const s = mod.settingsStore.get().settings;
    expect(s.name).toBe('ישראל');
    expect(s.uiFontSize).toBe(22);
    expect(s.autosaveMs).toBe(mod.DEFAULT_SETTINGS.autosaveMs);
  });

  it('מיזוג עמוק ל-bookIds — שדות חסרים נשמרים מברירת המחדל', async () => {
    await saveToHost({ bookIds: { mishnaBerurah: 'מ"ב מותאם' } as never });
    const mod = await freshSettings();
    await mod.loadSettings();
    const { bookIds } = mod.settingsStore.get().settings;
    expect(bookIds.mishnaBerurah).toBe('מ"ב מותאם');
    expect(bookIds.biurHalacha).toBe('ביאור הלכה');
  });

  it('מתקן שם ספר מברירת מחדל ישנה ושגויה', async () => {
    await saveToHost({ bookIds: { shulchanAruch: 'שולחן ערוך אורח חיים' } as never });
    const mod = await freshSettings();
    await mod.loadSettings();
    expect(mod.settingsStore.get().settings.bookIds.shulchanAruch).toBe('שולחן ערוך, אורח חיים');
  });

  it('מתקן כתובת יעד מברירת מחדל ישנה', async () => {
    await saveToHost({ recipientEmail: 'iyun1@iyun.co.il' });
    const mod = await freshSettings();
    await mod.loadSettings();
    expect(mod.settingsStore.get().settings.recipientEmail).toBe('8178002@gmail.com');
  });

  it('אינו נוגע בכתובת יעד שהמשתמש קבע בעצמו', async () => {
    await saveToHost({ recipientEmail: 'my@mail.com' });
    const mod = await freshSettings();
    await mod.loadSettings();
    expect(mod.settingsStore.get().settings.recipientEmail).toBe('my@mail.com');
  });
});

describe('updateSettings / setBookId', () => {
  it('updateSettings מעדכן מיד ושומר לאחר השהייה', async () => {
    vi.useFakeTimers();
    const mod = await freshSettings();
    mod.updateSettings({ name: 'משה' });
    expect(mod.settingsStore.get().settings.name).toBe('משה');
    expect(host.callsTo('storage.set')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(400);
    expect(host.callsTo('storage.set')).toHaveLength(1);
    expect((host.callsTo('storage.set')[0].payload.value as SettingsState).name).toBe('משה');
  });

  it('שינויים מהירים נשמרים בכתיבה אחת (debounce)', async () => {
    vi.useFakeTimers();
    const mod = await freshSettings();
    mod.updateSettings({ name: 'א' });
    mod.updateSettings({ name: 'אב' });
    mod.updateSettings({ name: 'אבג' });
    await vi.advanceTimersByTimeAsync(400);
    expect(host.callsTo('storage.set')).toHaveLength(1);
    expect((host.callsTo('storage.set')[0].payload.value as SettingsState).name).toBe('אבג');
  });

  it('setBookId מעדכן תפקיד אחד בלבד', async () => {
    const mod = await freshSettings();
    mod.setBookId('biurHalacha', 'ביאור הלכה החדש');
    const { bookIds } = mod.settingsStore.get().settings;
    expect(bookIds.biurHalacha).toBe('ביאור הלכה החדש');
    expect(bookIds.mishnaBerurah).toBe(mod.DEFAULT_SETTINGS.bookIds.mishnaBerurah);
  });

  it('מודיע למאזינים בכל עדכון', async () => {
    const mod = await freshSettings();
    const listener = vi.fn();
    mod.settingsStore.subscribe(listener);
    mod.updateSettings({ uiFontSize: 20 });
    mod.setBookId('mishnaBerurah', 'x');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('flushSettings', () => {
  it('שומר מיד ומבטל את ההשהייה', async () => {
    vi.useFakeTimers();
    const mod = await freshSettings();
    mod.updateSettings({ name: 'דחוף' });
    await mod.flushSettings();
    expect(host.callsTo('storage.set')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(host.callsTo('storage.set')).toHaveLength(1);
  });

  it('עובד גם ללא שינוי קודם', async () => {
    const mod = await freshSettings();
    await expect(mod.flushSettings()).resolves.toBeUndefined();
    expect(host.callsTo('storage.set')).toHaveLength(1);
  });
});

describe('useSettings', () => {
  it('מחזיר את ההגדרות הנוכחיות ומתעדכן', async () => {
    const mod = await freshSettings();
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => mod.useSettings());
    expect(result.current.uiFontSize).toBe(16);
    act(() => mod.updateSettings({ uiFontSize: 24 }));
    expect(result.current.uiFontSize).toBe(24);
  });
});
