import { createStore } from './createStore';
import { STORAGE_KEYS, storageGet, storageSet } from '../otzaria/storage';
import type { SettingsState, SourceRole } from '../data/types';

export const DEFAULT_SETTINGS: SettingsState = {
  schemaVersion: 1,
  name: '',
  personalCode: '',
  senderEmail: '',
  recipientEmail: '8178002@gmail.com',
  bookIds: {
    // שם הספר כפי שהוא מופיע בספריית אוצריא (עם פסיק) — חובה לדיוק בזיהוי.
    shulchanAruch: 'שולחן ערוך, אורח חיים',
    mishnaBerurah: 'משנה ברורה',
    biurHalacha: 'ביאור הלכה',
    shaarHatziyun: 'שער הציון',
  },
  autosaveMs: 1500,
  fontMode: 'default',
  uiFontSize: 16,
  sourcePaneMode: 'three',
  lastOpenIssueId: 'issue-0240',
  lastOpenWeekId: 'issue-0240-w1',
  remindersEnabled: false,
  reminderWeekday: 4, // יום חמישי
  reminderTime: '20:00',
  desktopNotifications: true,
  calendarReminders: true,
};

/**
 * שמות ספרים מברירת מחדל ישנה שזוהו שגוי (החזירו פירוש במקום הספר עצמו) —
 * ממירים אותם לערך התקין בעת טעינת הגדרות שמורות.
 */
const LEGACY_BOOK_ID_FIXES: Record<string, string> = {
  'שולחן ערוך אורח חיים': 'שולחן ערוך, אורח חיים',
};

/**
 * כתובות יעד מברירת מחדל ישנה — ממירים לכתובת השליחה הנוכחית, כדי שמשתמשים
 * עם הגדרות שמורות לא ישלחו ליעד הישן שלא בשימוש.
 */
const LEGACY_RECIPIENT_FIXES: Record<string, string> = {
  'iyun1@iyun.co.il': '8178002@gmail.com',
};

interface SettingsStoreState {
  loaded: boolean;
  settings: SettingsState;
}

export const settingsStore = createStore<SettingsStoreState>({
  loaded: false,
  settings: DEFAULT_SETTINGS,
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadSettings(): Promise<void> {
  const saved = await storageGet<Partial<SettingsState>>(STORAGE_KEYS.settings);
  const merged: SettingsState = {
    ...DEFAULT_SETTINGS,
    ...(saved ?? {}),
    // מיזוג עמוק ל-bookIds כדי לא לאבד ברירות מחדל בשדות חסרים
    bookIds: { ...DEFAULT_SETTINGS.bookIds, ...(saved?.bookIds ?? {}) },
  };
  // תיקון שמות ספרים שמורים מברירת מחדל ישנה ושגויה
  for (const role of Object.keys(merged.bookIds) as SourceRole[]) {
    const fixed = LEGACY_BOOK_ID_FIXES[merged.bookIds[role]];
    if (fixed) merged.bookIds[role] = fixed;
  }
  // תיקון כתובת יעד מברירת מחדל ישנה
  const fixedRecipient = LEGACY_RECIPIENT_FIXES[merged.recipientEmail];
  if (fixedRecipient) merged.recipientEmail = fixedRecipient;
  settingsStore.set({ loaded: true, settings: merged });
}

function persistSoon(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void storageSet(STORAGE_KEYS.settings, settingsStore.get().settings);
  }, 400);
}

export function updateSettings(patch: Partial<SettingsState>): void {
  settingsStore.set((prev) => ({ settings: { ...prev.settings, ...patch } }));
  persistSoon();
}

export function setBookId(role: SourceRole, bookId: string): void {
  settingsStore.set((prev) => ({
    settings: { ...prev.settings, bookIds: { ...prev.settings.bookIds, [role]: bookId } },
  }));
  persistSoon();
}

/** שמירה מיידית (למשל ב-beforeunload). */
export async function flushSettings(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await storageSet(STORAGE_KEYS.settings, settingsStore.get().settings);
}

export function useSettings(): SettingsState {
  return settingsStore.use((s) => s.settings);
}
