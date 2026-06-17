// ניהול תזכורות "אי לימוד/כתיבת תשובות": תזכורת שבועית קבועה (יום+שעה) שנשלחת
// כהתראת מערכת (שולחן עבודה) וכאירוע ללוח השנה של אוצריא — אך ורק כל עוד יש
// שבועות פעילים שטרם הושלמו. הכל מתואם מחדש בכל טעינה ובכל שינוי רלוונטי.

import { getAllWeeks } from '../data/localData';
import { getExamWeek } from '../data/examLoader';
import { answersStore } from './answersStore';
import { settingsStore } from './settingsStore';
import type { ScheduleWeek, SettingsState } from '../data/types';
import {
  cancelAllNotifications,
  checkNotificationPermissions,
  listOwnPublished,
  notificationsAvailable,
  removeCalendarEvent,
  scheduleSystemNotification,
  upsertCalendarEvent,
} from '../otzaria/notifications';

const CAL_KEY_PREFIX = 'iyun-reminder:';
const NOTIF_TITLE = 'עיון ההלכה — תזכורת';
const SOURCE_NAME = 'עיון ההלכה';
const OCCURRENCES = 8; // כמה תזכורות שבועיות קדימה לתזמן בכל פעם
const DAY_MS = 24 * 60 * 60 * 1000;

/** שבוע "תלוי": פעיל/עתידי, יש לו מבחן, ותשובתו טרם הושלמה. */
function pendingWeeks(): ScheduleWeek[] {
  const byWeek = answersStore.get().answers.answersByWeek;
  return getAllWeeks().filter((w) => {
    if (w.status === 'past') return false;
    if (!getExamWeek(w)) return false; // אין מבחן זמין לשבוע
    return byWeek[w.weekId]?.status !== 'completed';
  });
}

function reminderBody(pending: ScheduleWeek[]): string {
  const names = pending
    .map((w) => w.parasha || w.title)
    .filter(Boolean)
    .slice(0, 3);
  const more = pending.length - names.length;
  const list = names.join(', ') + (more > 0 ? ` ועוד ${more}` : '');
  if (pending.length === 1) {
    return `טרם הושלמה תשובת השבוע (${list}). זה הזמן ללמוד ולכתוב.`;
  }
  return `נותרו ${pending.length} שבועות ללא תשובה מלאה: ${list}. כדאי להתקדם בלימוד ובכתיבה.`;
}

/** מחזיר את N המופעים הבאים של (יום בשבוע, שעה) שעדיין בעתיד. */
function nextOccurrences(weekday: number, time: string, count: number, from: Date): Date[] {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 20;
  const minute = Number.isFinite(m) ? m : 0;

  // המופע הראשון: היום בשבוע הקרוב בשעה שנבחרה
  const first = new Date(from);
  first.setHours(hour, minute, 0, 0);
  let delta = (weekday - first.getDay() + 7) % 7;
  if (delta === 0 && first.getTime() <= from.getTime()) delta = 7; // עבר היום — לשבוע הבא
  first.setDate(first.getDate() + delta);

  const res: Date[] = [];
  for (let i = 0; i < count; i++) {
    res.push(new Date(first.getTime() + i * 7 * DAY_MS));
  }
  return res;
}

/** מזהה התראה דטרמיניסטי לפי תאריך המופע (יום מאז epoch — בטווח 32 ביט). */
function notifIdForDate(d: Date): number {
  return Math.floor(d.getTime() / DAY_MS);
}

function calKeyForDate(d: Date): string {
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return CAL_KEY_PREFIX + ymd;
}

/** הסרת כל אירועי התזכורת שפרסמנו ללוח השנה. */
async function clearAllCalendarReminders(): Promise<void> {
  const rows = await listOwnPublished();
  await Promise.all(
    rows
      .filter((r) => r.type === 'calendar.event' && r.key.startsWith(CAL_KEY_PREFIX))
      .map((r) => removeCalendarEvent(r.key)),
  );
}

let lastSignature = '';

function signature(s: SettingsState, pending: ScheduleWeek[]): string {
  return JSON.stringify({
    e: s.remindersEnabled,
    wd: s.reminderWeekday,
    t: s.reminderTime,
    d: s.desktopNotifications,
    c: s.calendarReminders,
    p: pending.map((w) => w.weekId).sort(),
  });
}

/**
 * מתאם את כל התזכורות למצב הנוכחי (הגדרות + שבועות תלויים).
 * force=true מבצע תיאום גם אם החתימה לא השתנתה (למשל בעת boot).
 */
export async function reconcileReminders(force = false): Promise<void> {
  if (!notificationsAvailable()) return; // dev/דפדפן — אין host
  const s = settingsStore.get().settings;
  const pending = s.remindersEnabled ? pendingWeeks() : [];
  const sig = signature(s, pending);
  if (!force && sig === lastSignature) return;
  lastSignature = sig;

  // מתג ראשי כבוי, או שאין שבועות תלויים — מנקים הכל
  if (!s.remindersEnabled || pending.length === 0) {
    await cancelAllNotifications();
    await clearAllCalendarReminders();
    return;
  }

  const now = new Date();
  const occurrences = nextOccurrences(s.reminderWeekday, s.reminderTime, OCCURRENCES, now);
  const body = reminderBody(pending);

  // ── שולחן עבודה (התראות מערכת) ──
  if (s.desktopNotifications) {
    const perm = await checkNotificationPermissions();
    if (perm.granted) {
      await cancelAllNotifications();
      for (const d of occurrences) {
        await scheduleSystemNotification(notifIdForDate(d), NOTIF_TITLE, body, d.toISOString());
      }
    }
    // אין הרשאה — לא מתזמנים (ולא מבקשים אוטומטית; הבקשה נעשית מההגדרות)
  } else {
    await cancelAllNotifications();
  }

  // ── לוח השנה (אירועים מפורסמים) ──
  if (s.calendarReminders) {
    const desiredKeys = new Set(occurrences.map(calKeyForDate));
    const rows = await listOwnPublished();
    // הסרת אירועי תזכורת ישנים שאינם בקבוצה הנוכחית
    await Promise.all(
      rows
        .filter(
          (r) =>
            r.type === 'calendar.event' &&
            r.key.startsWith(CAL_KEY_PREFIX) &&
            !desiredKeys.has(r.key),
        )
        .map((r) => removeCalendarEvent(r.key)),
    );
    for (const d of occurrences) {
      await upsertCalendarEvent(calKeyForDate(d), {
        title: NOTIF_TITLE,
        startsAt: d.toISOString(),
        source: SOURCE_NAME,
        importance: 'high',
        description: body,
      });
    }
  } else {
    await clearAllCalendarReminders();
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function scheduleReconcile(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void reconcileReminders(false);
  }, 1500);
}

/**
 * אתחול חד-פעמי: תיאום ראשוני + האזנה לשינויים בהגדרות ובתשובות.
 * נקרא לאחר טעינת ההגדרות, התשובות והמבחנים.
 */
export function initReminders(): void {
  if (initialized) return;
  initialized = true;
  settingsStore.subscribe(scheduleReconcile);
  answersStore.subscribe(scheduleReconcile);
  void reconcileReminders(true);
}
