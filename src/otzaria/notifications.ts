// עטיפה לקריאות התראות מערכת (notifications.*) ופרסום אירועים ללוח השנה
// (publishedData.upsert מסוג calendar.event). כל הקריאות "רכות" — לא זורקות.

import { callOtzaria, callOtzariaSafe, hasOtzaria } from './sdk';
import type { CalendarEventPayload } from './otzaria_plugin';

export interface NotifPermissions {
  granted: boolean;
  initialized: boolean;
}

/** בדיקת הרשאות התראות מערכת (ללא בקשת הרשאה / דיאלוג). */
export async function checkNotificationPermissions(): Promise<NotifPermissions> {
  return await callOtzariaSafe<NotifPermissions>(
    'notifications.checkPermissions',
    {},
    { granted: false, initialized: false },
  );
}

/** בקשת הרשאת התראות מהמשתמש (עשוי להציג דיאלוג מערכת). */
export async function requestNotificationPermissions(): Promise<boolean> {
  const res = await callOtzariaSafe<{ granted: boolean }>(
    'notifications.requestPermissions',
    {},
    { granted: false },
  );
  return !!res.granted;
}

/** שליחת התראת מערכת מיידית. */
export async function sendSystemNotification(
  id: number,
  title: string,
  body: string,
): Promise<boolean> {
  try {
    await callOtzaria('notifications.sendSystem', { id, title, body });
    return true;
  } catch {
    return false;
  }
}

/** תזמון התראת מערכת לזמן עתידי (ISO 8601). */
export async function scheduleSystemNotification(
  id: number,
  title: string,
  body: string,
  scheduledTime: string,
): Promise<boolean> {
  try {
    await callOtzaria('notifications.scheduleSystem', { id, title, body, scheduledTime });
    return true;
  } catch {
    return false;
  }
}

/** ביטול כל ההתראות המתוזמנות של התוסף. */
export async function cancelAllNotifications(): Promise<void> {
  await callOtzariaSafe('notifications.cancelAll', {}, false);
}

/** התראה בתוך האפליקציה (snackbar של אוצריא). */
export async function showInAppNotification(
  message: string,
  type: 'info' | 'success' | 'error' = 'info',
): Promise<void> {
  await callOtzariaSafe('notifications.showInApp', { message, type }, undefined);
}

// ── אירועי לוח שנה (publishedData / calendar.event) ──

const CAL_TYPE = 'calendar.event';
const CAL_SCOPE = 'global';

/** פרסום/עדכון אירוע ללוח השנה של אוצריא. */
export async function upsertCalendarEvent(
  key: string,
  payload: CalendarEventPayload,
): Promise<boolean> {
  return (
    (await callOtzariaSafe<boolean>(
      'publishedData.upsert',
      { type: CAL_TYPE, scope: CAL_SCOPE, key, payload },
      false,
    )) === true
  );
}

/** הסרת אירוע לוח שנה שפורסם. */
export async function removeCalendarEvent(key: string): Promise<void> {
  await callOtzariaSafe('publishedData.remove', { type: CAL_TYPE, scope: CAL_SCOPE, key }, false);
}

export interface PublishedRow {
  type: string;
  scope: string;
  key: string;
  payload: unknown;
}

/** רשימת כל הרשומות שהתוסף פרסם (לצורך ניקוי אירועים ישנים). */
export async function listOwnPublished(): Promise<PublishedRow[]> {
  return await callOtzariaSafe<PublishedRow[]>('publishedData.listOwn', {}, []);
}

/** האם פעולות התראה/לוח־שנה זמינות (רצים בתוך אוצריא). */
export function notificationsAvailable(): boolean {
  return hasOtzaria();
}
