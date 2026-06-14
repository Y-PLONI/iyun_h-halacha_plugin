// שכבת storage. ה-host עושה JSON encode/decode בעצמו — שומרים/מקבלים אובייקט גולמי.
// משתמשים ב-storage.get/set/remove/list (לא plugin.storage.*) עם הרשאות plugin.storage.read/write.

import { callOtzaria, hasOtzaria } from './sdk';

const DEV_PREFIX = 'iyun-halacha:';

/** קריאת ערך. מחזיר null אם לא קיים. בדפדפן dev — נופל ל-localStorage. */
export async function storageGet<T>(key: string): Promise<T | null> {
  if (hasOtzaria()) {
    const data = await callOtzaria<T | null>('storage.get', { key });
    return data ?? null;
  }
  const raw = localStorage.getItem(DEV_PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** שמירת ערך (אובייקט גולמי — אין לעשות JSON.stringify ידני). */
export async function storageSet<T>(key: string, value: T): Promise<void> {
  if (hasOtzaria()) {
    await callOtzaria<boolean>('storage.set', { key, value: value as unknown as Record<string, unknown> });
    return;
  }
  localStorage.setItem(DEV_PREFIX + key, JSON.stringify(value));
}

export async function storageRemove(key: string): Promise<void> {
  if (hasOtzaria()) {
    await callOtzaria<boolean>('storage.remove', { key });
    return;
  }
  localStorage.removeItem(DEV_PREFIX + key);
}

export async function storageList(): Promise<string[]> {
  if (hasOtzaria()) {
    return await callOtzaria<string[]>('storage.list', {});
  }
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(DEV_PREFIX))
    .map((k) => k.slice(DEV_PREFIX.length));
}

// מפתחות storage
export const STORAGE_KEYS = {
  answers: 'answers:v1',
  settings: 'settings:v1',
  splitSizes: 'split-sizes:v1',
} as const;
