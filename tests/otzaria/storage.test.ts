import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  storageGet,
  storageList,
  storageRemove,
  storageSet,
} from '../../src/otzaria/storage';
import { defaultHandlers, installFakeHost } from '../helpers/host';

describe('STORAGE_KEYS', () => {
  it('מפתחות עם גרסה (answers v2, settings v1, split v2)', () => {
    expect(STORAGE_KEYS).toEqual({
      answers: 'answers:v2',
      settings: 'settings:v1',
      splitSizes: 'split-sizes:v2',
    });
  });
});

describe('storage דרך ה-host', () => {
  it('set/get מעבירים אובייקט גולמי (בלי stringify ידני)', async () => {
    const host = installFakeHost(defaultHandlers());
    await storageSet('k', { a: 1, ב: 'ערך' });
    expect(host.callsTo('storage.set')[0].payload).toEqual({ key: 'k', value: { a: 1, ב: 'ערך' } });
    await expect(storageGet('k')).resolves.toEqual({ a: 1, ב: 'ערך' });
  });

  it('get מחזיר null למפתח לא קיים', async () => {
    installFakeHost(defaultHandlers());
    await expect(storageGet('none')).resolves.toBeNull();
  });

  it('remove מוחק מה-host', async () => {
    const host = installFakeHost(defaultHandlers());
    await storageSet('k', 1);
    await storageRemove('k');
    expect(host.callsTo('storage.remove')[0].payload).toEqual({ key: 'k' });
    await expect(storageGet('k')).resolves.toBeNull();
  });

  it('list מחזיר את מפתחות ה-host', async () => {
    installFakeHost(defaultHandlers());
    await storageSet('a', 1);
    await storageSet('b', 2);
    await expect(storageList()).resolves.toEqual(['a', 'b']);
  });

  it('get זורק כשה-host מחזיר כשל', async () => {
    const host = installFakeHost(defaultHandlers());
    host.fail('storage.get', 'error.permission_denied');
    await expect(storageGet('k')).rejects.toThrow('error.permission_denied');
  });
});

describe('storage בדפדפן (fallback ל-localStorage)', () => {
  it('שומר עם prefix של התוסף', async () => {
    await storageSet('answers:v2', { x: 1 });
    expect(localStorage.getItem('iyun-halacha:answers:v2')).toBe('{"x":1}');
  });

  it('get מחזיר את הערך המפוענח, ו-null כשאין', async () => {
    await storageSet('k', { a: [1, 2] });
    await expect(storageGet('k')).resolves.toEqual({ a: [1, 2] });
    await expect(storageGet('missing')).resolves.toBeNull();
  });

  it('remove מוחק מ-localStorage', async () => {
    await storageSet('k', 1);
    await storageRemove('k');
    await expect(storageGet('k')).resolves.toBeNull();
  });

  it('list מחזיר מפתחות ללא ה-prefix ומתעלם מזרים', async () => {
    localStorage.setItem('other-app:zzz', '1');
    await storageSet('settings:v1', {});
    await storageSet('answers:v2', {});
    const keys = await storageList();
    expect(keys.sort()).toEqual(['answers:v2', 'settings:v1']);
  });

  it('מפתחות התוסף אינם דורסים מפתחות של אפליקציות אחרות', async () => {
    localStorage.setItem('answers:v2', 'foreign');
    await storageSet('answers:v2', { mine: true });
    expect(localStorage.getItem('answers:v2')).toBe('foreign');
  });
});
