// תזכורות: תיאום התראות מערכת ואירועי לוח שנה לפי ההגדרות והשבועות שטרם הושלמו.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import type { PublishedRow } from '../../src/otzaria/notifications';

type RemindersModule = typeof import('../../src/state/reminders');
type SettingsModule = typeof import('../../src/state/settingsStore');
type AnswersModule = typeof import('../../src/state/answersStore');
type LoaderModule = typeof import('../../src/data/examLoader');

interface Ctx {
  reminders: RemindersModule;
  settings: SettingsModule;
  answers: AnswersModule;
  loader: LoaderModule;
}

/**
 * טוען מודולים טריים (למצב פנימי נקי) וממיר את מסמכי ה-docx — לפני הפעלת
 * הטיימרים המדומים, כי ההמרה (mammoth/jszip) תלויה בטיימרים אמיתיים.
 */
async function freshReminders(now = new Date(2026, 6, 26, 10, 0, 0)): Promise<Ctx> {
  vi.useRealTimers();
  vi.resetModules();
  const loader = await import('../../src/data/examLoader');
  await loader.loadExams();
  const settings = await import('../../src/state/settingsStore');
  const answers = await import('../../src/state/answersStore');
  const reminders = await import('../../src/state/reminders');
  vi.useFakeTimers();
  vi.setSystemTime(now);
  return { reminders, settings, answers, loader };
}

let host: FakeHost;
/** לוח השנה המדומה של אוצריא — publishedData.upsert/remove/listOwn */
let published: Map<string, PublishedRow>;

function installHostWithCalendar(): void {
  published = new Map();
  host = installFakeHost({
    ...defaultHandlers(),
    'publishedData.upsert': (p) => {
      published.set(String(p.key), {
        type: String(p.type),
        scope: String(p.scope),
        key: String(p.key),
        payload: p.payload,
      });
      return true;
    },
    'publishedData.remove': (p) => {
      published.delete(String(p.key));
      return true;
    },
    'publishedData.listOwn': () => [...published.values()],
  });
}

const REMINDERS_ON = {
  remindersEnabled: true,
  reminderWeekday: 4,
  reminderTime: '20:00',
  desktopNotifications: true,
  calendarReminders: true,
};

beforeEach(() => {
  installHostWithCalendar();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reconcileReminders — ללא host', () => {
  it('אינו עושה דבר מחוץ לאוצריא', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    host.uninstall();
    await ctx.reminders.reconcileReminders(true);
    expect(host.calls).toHaveLength(0);
  });
});

describe('reconcileReminders — תזכורות כבויות', () => {
  it('מנקה התראות ואירועים כשהמתג הראשי כבוי', async () => {
    const ctx = await freshReminders();
    published.set('iyun-reminder:2026-07-30', {
      type: 'calendar.event',
      scope: 'global',
      key: 'iyun-reminder:2026-07-30',
      payload: {},
    });
    await ctx.reminders.reconcileReminders(true);
    expect(host.callsTo('notifications.cancelAll')).toHaveLength(1);
    expect(published.size).toBe(0);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(0);
  });

  it('אינו נוגע ברשומות שאינן תזכורות של התוסף', async () => {
    const ctx = await freshReminders();
    published.set('other:1', { type: 'calendar.event', scope: 'global', key: 'other:1', payload: {} });
    published.set('iyun-reminder:2026-07-30', {
      type: 'calendar.event',
      scope: 'global',
      key: 'iyun-reminder:2026-07-30',
      payload: {},
    });
    await ctx.reminders.reconcileReminders(true);
    expect([...published.keys()]).toEqual(['other:1']);
  });

  it('כשכל השבועות הושלמו — מנקה הכל למרות שהתזכורות דלוקות', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    const { getAllWeeks } = await import('../../src/data/localData');
    for (const w of getAllWeeks()) ctx.answers.setAnswerStatus(w, 'completed');
    await ctx.reminders.reconcileReminders(true);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(0);
    expect(published.size).toBe(0);
  });
});

describe('reconcileReminders — תזמון', () => {
  it('מתזמן 8 התראות שבועיות ביום ובשעה שנבחרו', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);

    const scheduled = host.callsTo('notifications.scheduleSystem');
    expect(scheduled).toHaveLength(8);
    const times = scheduled.map((c) => new Date(String(c.payload.scheduledTime)));
    for (const t of times) {
      expect(t.getDay()).toBe(4); // חמישי
      expect(t.getHours()).toBe(20);
      expect(t.getMinutes()).toBe(0);
      expect(t.getTime()).toBeGreaterThan(Date.now());
    }
    // מרווח של שבוע בין מופעים
    for (let i = 1; i < times.length; i++) {
      expect(times[i].getTime() - times[i - 1].getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });

  it('מבטל התראות קודמות לפני תזמון מחדש', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const cancelIndex = host.methods().indexOf('notifications.cancelAll');
    const firstSchedule = host.methods().indexOf('notifications.scheduleSystem');
    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(cancelIndex).toBeLessThan(firstSchedule);
  });

  it('מזהי ההתראות ייחודיים ודטרמיניסטיים (יום מאז epoch)', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const calls = host.callsTo('notifications.scheduleSystem');
    const ids = calls.map((c) => Number(c.payload.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of calls) {
      const expected = Math.floor(new Date(String(c.payload.scheduledTime)).getTime() / 86400000);
      expect(Number(c.payload.id)).toBe(expected);
    }
  });

  it('אם היום הוא היום שנבחר והשעה עברה — המופע הראשון בשבוע הבא', async () => {
    // חמישי 21:00 — אחרי שעת התזכורת
    const ctx = await freshReminders(new Date(2026, 6, 30, 21, 0, 0));
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const first = new Date(String(host.callsTo('notifications.scheduleSystem')[0].payload.scheduledTime));
    expect(first.getDate()).toBe(6); // 6.8.2026, חמישי הבא
    expect(first.getMonth()).toBe(7);
  });

  it('אם היום הוא היום שנבחר והשעה טרם הגיעה — המופע הראשון היום', async () => {
    // חמישי 8:00 — לפני שעת התזכורת
    const ctx = await freshReminders(new Date(2026, 6, 30, 8, 0, 0));
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const first = new Date(String(host.callsTo('notifications.scheduleSystem')[0].payload.scheduledTime));
    expect(first.getDate()).toBe(30);
    expect(first.getHours()).toBe(20);
  });

  it('מכבד שעה מותאמת (HH:MM)', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings({ ...REMINDERS_ON, reminderWeekday: 1, reminderTime: '07:45' });
    await ctx.reminders.reconcileReminders(true);
    const first = new Date(String(host.callsTo('notifications.scheduleSystem')[0].payload.scheduledTime));
    expect(first.getDay()).toBe(1);
    expect(first.getHours()).toBe(7);
    expect(first.getMinutes()).toBe(45);
  });

  it('שעה לא חוקית נופלת ל-20:00', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings({ ...REMINDERS_ON, reminderTime: 'לא-שעה' });
    await ctx.reminders.reconcileReminders(true);
    const first = new Date(String(host.callsTo('notifications.scheduleSystem')[0].payload.scheduledTime));
    expect(first.getHours()).toBe(20);
    expect(first.getMinutes()).toBe(0);
  });
});

describe('reconcileReminders — ערוצים', () => {
  it('ערוץ שולחן עבודה כבוי — אין תזמון, אך יש ניקוי', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings({ ...REMINDERS_ON, desktopNotifications: false });
    await ctx.reminders.reconcileReminders(true);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(0);
    expect(host.callsTo('notifications.cancelAll')).toHaveLength(1);
    expect(published.size).toBeGreaterThan(0); // לוח השנה עדיין פעיל
  });

  it('ללא הרשאת מערכת — אין תזמון ואין בקשת הרשאה אוטומטית', async () => {
    const ctx = await freshReminders();
    host.on('notifications.checkPermissions', { granted: false, initialized: true });
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(0);
    expect(host.callsTo('notifications.requestPermissions')).toHaveLength(0);
  });

  it('ערוץ לוח שנה כבוי — מנקה אירועים ומשאיר התראות מערכת', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings({ ...REMINDERS_ON, calendarReminders: false });
    await ctx.reminders.reconcileReminders(true);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(8);
    expect(published.size).toBe(0);
  });

  it('מפרסם 8 אירועי לוח שנה עם מפתח לפי תאריך ותוכן מלא', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    expect(published.size).toBe(8);
    for (const [key, row] of published) {
      expect(key).toMatch(/^iyun-reminder:\d{4}-\d{2}-\d{2}$/);
      expect(row.type).toBe('calendar.event');
      expect(row.scope).toBe('global');
      const payload = row.payload as Record<string, unknown>;
      expect(payload.title).toBe('עיון ההלכה — תזכורת');
      expect(payload.source).toBe('עיון ההלכה');
      expect(payload.importance).toBe('high');
      expect(String(payload.description)).toContain('שבועות');
      expect(new Date(String(payload.startsAt)).getDay()).toBe(4);
    }
  });

  it('מסיר אירועי תזכורת ישנים שאינם בטווח הנוכחי', async () => {
    const ctx = await freshReminders();
    published.set('iyun-reminder:2020-01-01', {
      type: 'calendar.event',
      scope: 'global',
      key: 'iyun-reminder:2020-01-01',
      payload: {},
    });
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    expect(published.has('iyun-reminder:2020-01-01')).toBe(false);
    expect(published.size).toBe(8);
  });
});

describe('reconcileReminders — תוכן ההודעה', () => {
  it('רבים: מציין את מספר השבועות, שלוש פרשות ו"ועוד N"', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const body = String(host.callsTo('notifications.scheduleSystem')[0].payload.body);
    expect(body).toMatch(/נותרו \d+ שבועות ללא תשובה מלאה/);
    expect(body).toContain('ועוד');
    expect(body.split(',').length).toBeGreaterThanOrEqual(3);
  });

  it('שבוע אחד: נוסח יחיד עם שם הפרשה', async () => {
    const ctx = await freshReminders();
    const { getAllWeeks } = await import('../../src/data/localData');
    const weeks = getAllWeeks().filter((w) => w.status !== 'past');
    for (const w of weeks.slice(1)) ctx.answers.setAnswerStatus(w, 'completed');
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const body = String(host.callsTo('notifications.scheduleSystem')[0].payload.body);
    expect(body).toContain('טרם הושלמה תשובת השבוע');
    expect(body).toContain(weeks[0].parasha);
  });

  it('שבועות "past" ושבועות שהושלמו אינם נכללים', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const body = String(host.callsTo('notifications.scheduleSystem')[0].payload.body);
    expect(body).not.toContain('בהר-בחוקתי'); // שבוע past של גליון רל"ט
  });
});

describe('reconcileReminders — חתימת מצב', () => {
  it('קריאה חוזרת ללא שינוי אינה מתאמת מחדש', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const callsAfterFirst = host.calls.length;
    await ctx.reminders.reconcileReminders(false);
    expect(host.calls.length).toBe(callsAfterFirst);
  });

  it('force מתאם מחדש גם ללא שינוי', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const callsAfterFirst = host.calls.length;
    await ctx.reminders.reconcileReminders(true);
    expect(host.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('שינוי הגדרה מפעיל תיאום מחדש', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const before = host.callsTo('notifications.scheduleSystem').length;
    ctx.settings.updateSettings({ reminderWeekday: 2 });
    await ctx.reminders.reconcileReminders(false);
    expect(host.callsTo('notifications.scheduleSystem').length).toBeGreaterThan(before);
  });

  it('סימון שבוע כהושלם מפעיל תיאום מחדש', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    await ctx.reminders.reconcileReminders(true);
    const bodyBefore = String(host.callsTo('notifications.scheduleSystem')[0].payload.body);
    const { getWeek } = await import('../../src/data/localData');
    ctx.answers.setAnswerStatus(getWeek('issue-0242-w1')!, 'completed');
    await ctx.reminders.reconcileReminders(false);
    const bodyAfter = String(host.callsTo('notifications.scheduleSystem').at(-1)!.payload.body);
    expect(bodyAfter).not.toBe(bodyBefore);
  });
});

describe('initReminders', () => {
  it('מתאם מיד ונרשם לשינויים בהגדרות ובתשובות', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    ctx.reminders.initReminders();
    await vi.advanceTimersByTimeAsync(0);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(8);

    ctx.settings.updateSettings({ reminderTime: '21:00' });
    await vi.advanceTimersByTimeAsync(1500);
    const last = new Date(String(host.callsTo('notifications.scheduleSystem').at(-1)!.payload.scheduledTime));
    expect(last.getHours()).toBe(21);
  });

  it('משהה (debounce) שינויים רצופים לתיאום אחד', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    ctx.reminders.initReminders();
    await vi.advanceTimersByTimeAsync(0);
    const before = host.callsTo('notifications.scheduleSystem').length;

    ctx.settings.updateSettings({ reminderTime: '21:00' });
    ctx.settings.updateSettings({ reminderTime: '22:00' });
    ctx.settings.updateSettings({ reminderTime: '23:00' });
    await vi.advanceTimersByTimeAsync(1500);
    expect(host.callsTo('notifications.scheduleSystem').length).toBe(before + 8);
  });

  it('קריאה שניה ל-initReminders אינה נרשמת שוב', async () => {
    const ctx = await freshReminders();
    ctx.settings.updateSettings(REMINDERS_ON);
    ctx.reminders.initReminders();
    ctx.reminders.initReminders();
    await vi.advanceTimersByTimeAsync(1500);
    expect(host.callsTo('notifications.scheduleSystem')).toHaveLength(8);
  });
});
