/// <reference path="./otzaria_plugin.d.ts" />
// עטיפה מרכזית אחת לכל קריאות אוצריא, כדי שלא יתפזרו Otzaria.call בכל הקוד.

import type { BootPayload, ThemePayload } from './otzaria_plugin';

export type { BootPayload, ThemePayload };

/** האם רצים בתוך אוצריא (להבדיל מ-mock בדפדפן) */
export function hasOtzaria(): boolean {
  return typeof window !== 'undefined' && !!window.Otzaria;
}

/**
 * קריאה למתודת host. זורקת שגיאה אם success=false, אחרת מחזירה את data.
 * כל שאר הקוד מסתמך על כך שזריקה = כשל, ולכן עוטפים ב-try/catch במקום הצורך.
 */
export async function callOtzaria<T>(
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  if (!window.Otzaria) {
    throw new Error('error.sdk_unavailable: Otzaria SDK is not available');
  }
  const res = await window.Otzaria.call<T>(method, payload ?? {});
  if (!res || !res.success) {
    const code = res?.error?.code ?? 'error.unknown';
    const message = res?.error?.message ?? '';
    throw new Error(`${code}: ${message}`);
  }
  return res.data;
}

/** קריאה "רכה" שמחזירה fallback במקום לזרוק, לפעולות לא קריטיות. */
export async function callOtzariaSafe<T>(
  method: string,
  payload: Record<string, unknown> | undefined,
  fallback: T,
): Promise<T> {
  try {
    return await callOtzaria<T>(method, payload);
  } catch {
    return fallback;
  }
}

type EventName =
  | 'plugin.boot'
  | 'plugin.ready'
  | 'theme.changed'
  | string;

export function onOtzaria(event: EventName, cb: (detail: unknown) => void): void {
  window.Otzaria?.on(event, cb);
}

export function offOtzaria(event: EventName, cb: (detail: unknown) => void): void {
  window.Otzaria?.off(event, cb);
}

// ── הודעות UI דרך ה-host (הרשאת ui.feedback) עם fallback ──

export async function showMessage(message: string): Promise<void> {
  await callOtzariaSafe('ui.showMessage', { message }, undefined);
}

export async function showError(message: string): Promise<void> {
  const ok = await callOtzariaSafe<boolean>('ui.showError', { message }, false);
  if (!ok && !hasOtzaria()) console.error(message);
}

export async function showSuccess(message: string): Promise<void> {
  await callOtzariaSafe('ui.showSuccess', { message }, undefined);
}
