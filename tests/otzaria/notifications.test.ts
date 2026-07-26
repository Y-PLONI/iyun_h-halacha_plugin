import { describe, expect, it } from 'vitest';
import {
  cancelAllNotifications,
  checkNotificationPermissions,
  listOwnPublished,
  notificationsAvailable,
  removeCalendarEvent,
  requestNotificationPermissions,
  scheduleSystemNotification,
  sendSystemNotification,
  showInAppNotification,
  upsertCalendarEvent,
} from '../../src/otzaria/notifications';
import { defaultHandlers, installFakeHost } from '../helpers/host';

describe('notificationsAvailable', () => {
  it('אמת רק בתוך אוצריא', () => {
    expect(notificationsAvailable()).toBe(false);
    installFakeHost();
    expect(notificationsAvailable()).toBe(true);
  });
});

describe('הרשאות התראות', () => {
  it('checkNotificationPermissions מחזיר את מצב ההרשאה', async () => {
    installFakeHost({ 'notifications.checkPermissions': { granted: true, initialized: true } });
    await expect(checkNotificationPermissions()).resolves.toEqual({ granted: true, initialized: true });
  });

  it('checkNotificationPermissions מחזיר granted:false בכשל וללא host', async () => {
    const host = installFakeHost();
    host.fail('notifications.checkPermissions');
    await expect(checkNotificationPermissions()).resolves.toEqual({ granted: false, initialized: false });
    host.uninstall();
    await expect(checkNotificationPermissions()).resolves.toEqual({ granted: false, initialized: false });
  });

  it('requestNotificationPermissions מחזיר boolean', async () => {
    const host = installFakeHost({ 'notifications.requestPermissions': { granted: true } });
    await expect(requestNotificationPermissions()).resolves.toBe(true);
    host.on('notifications.requestPermissions', { granted: false });
    await expect(requestNotificationPermissions()).resolves.toBe(false);
    host.fail('notifications.requestPermissions');
    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });
});

describe('התראות מערכת', () => {
  it('sendSystemNotification מעביר id/title/body', async () => {
    const host = installFakeHost(defaultHandlers());
    await expect(sendSystemNotification(7, 'כותרת', 'גוף')).resolves.toBe(true);
    expect(host.callsTo('notifications.sendSystem')[0].payload).toEqual({
      id: 7,
      title: 'כותרת',
      body: 'גוף',
    });
  });

  it('scheduleSystemNotification מעביר גם scheduledTime', async () => {
    const host = installFakeHost(defaultHandlers());
    await expect(
      scheduleSystemNotification(7, 'כותרת', 'גוף', '2026-08-01T20:00:00.000Z'),
    ).resolves.toBe(true);
    expect(host.callsTo('notifications.scheduleSystem')[0].payload).toEqual({
      id: 7,
      title: 'כותרת',
      body: 'גוף',
      scheduledTime: '2026-08-01T20:00:00.000Z',
    });
  });

  it('מחזירים false בכשל ולא זורקים', async () => {
    const host = installFakeHost();
    host.fail('notifications.sendSystem');
    host.throws('notifications.scheduleSystem');
    await expect(sendSystemNotification(1, 'a', 'b')).resolves.toBe(false);
    await expect(scheduleSystemNotification(1, 'a', 'b', 'now')).resolves.toBe(false);
  });

  it('cancelAllNotifications ו-showInApp אינם זורקים ללא host', async () => {
    await expect(cancelAllNotifications()).resolves.toBeUndefined();
    await expect(showInAppNotification('הודעה')).resolves.toBeUndefined();
  });

  it('showInAppNotification מעביר סוג ברירת מחדל info', async () => {
    const host = installFakeHost(defaultHandlers());
    await showInAppNotification('הודעה');
    await showInAppNotification('שגיאה', 'error');
    expect(host.callsTo('notifications.showInApp').map((c) => c.payload)).toEqual([
      { message: 'הודעה', type: 'info' },
      { message: 'שגיאה', type: 'error' },
    ]);
  });
});

describe('אירועי לוח שנה (publishedData)', () => {
  it('upsertCalendarEvent מפרסם type/scope/key/payload', async () => {
    const host = installFakeHost(defaultHandlers());
    const payload = {
      title: 'תזכורת',
      startsAt: '2026-08-01T20:00:00.000Z',
      source: 'עיון ההלכה',
      importance: 'high' as const,
      description: 'גוף',
    };
    await expect(upsertCalendarEvent('iyun-reminder:2026-08-01', payload)).resolves.toBe(true);
    expect(host.callsTo('publishedData.upsert')[0].payload).toEqual({
      type: 'calendar.event',
      scope: 'global',
      key: 'iyun-reminder:2026-08-01',
      payload,
    });
  });

  it('upsertCalendarEvent מחזיר false בכשל', async () => {
    const host = installFakeHost();
    host.fail('publishedData.upsert');
    await expect(
      upsertCalendarEvent('k', { title: 't', startsAt: 'x', source: 's' }),
    ).resolves.toBe(false);
  });

  it('removeCalendarEvent מסיר לפי מפתח', async () => {
    const host = installFakeHost(defaultHandlers());
    await removeCalendarEvent('iyun-reminder:2026-08-01');
    expect(host.callsTo('publishedData.remove')[0].payload).toEqual({
      type: 'calendar.event',
      scope: 'global',
      key: 'iyun-reminder:2026-08-01',
    });
  });

  it('listOwnPublished מחזיר רשומות, ו-[] בכשל', async () => {
    const rows = [{ type: 'calendar.event', scope: 'global', key: 'k', payload: {} }];
    const host = installFakeHost({ 'publishedData.listOwn': rows });
    await expect(listOwnPublished()).resolves.toEqual(rows);
    host.fail('publishedData.listOwn');
    await expect(listOwnPublished()).resolves.toEqual([]);
  });
});
