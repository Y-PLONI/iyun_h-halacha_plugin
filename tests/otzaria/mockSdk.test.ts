// ה-mock SDK הוא הבסיס לפיתוח בדפדפן — בודקים שהוא עונה על כל מה שהתוסף צריך.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockBootPayload, createMockTheme, installMockOtzaria } from '../../src/otzaria/mockSdk';
import manifest from '../../manifest.json';

async function call<T>(method: string, payload?: Record<string, unknown>) {
  return await window.Otzaria.call<T>(method, payload ?? {});
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createMockBootPayload', () => {
  it('כולל מזהה תוסף, גרסת אפליקציה ו-theme', () => {
    const boot = createMockBootPayload();
    expect(boot.plugin.id).toBe(manifest.id);
    expect(boot.app.version).toBe(manifest.minAppVersion);
    expect(boot.app.textDirection).toBe('rtl');
    expect(boot.theme?.mode).toBe('light');
  });

  it('ההרשאות המדומות הן תת-קבוצה של הרשאות ה-manifest', () => {
    for (const perm of createMockBootPayload().permissions) {
      expect(manifest.permissions).toContain(perm);
    }
  });
});

describe('createMockTheme', () => {
  it('מחזיר סכמת צבעים לכל מצב', () => {
    expect(createMockTheme('light').colorScheme?.surface).toBe('#FEF7FF');
    expect(createMockTheme('dark').colorScheme?.surface).toBe('#141218');
  });

  it('כולל טיפוגרפיה בשני המצבים', () => {
    for (const mode of ['light', 'dark'] as const) {
      const t = createMockTheme(mode);
      expect(t.typography?.fontFamily).toBe('FrankRuhlCLM');
      expect(t.typography?.lineHeight).toBe(1.6);
    }
  });
});

describe('installMockOtzaria', () => {
  it('מתקין window.Otzaria עם call/on/off', () => {
    installMockOtzaria();
    expect(typeof window.Otzaria.call).toBe('function');
    expect(typeof window.Otzaria.on).toBe('function');
    expect(typeof window.Otzaria.off).toBe('function');
  });

  it('library.findBooks מסנן לפי המחרוזת', async () => {
    installMockOtzaria();
    const res = await call<{ title: string }[]>('library.findBooks', { query: 'משנה ברורה' });
    expect(res.success).toBe(true);
    expect(res.data.map((b) => b.title)).toEqual(['משנה ברורה']);
    const none = await call<unknown[]>('library.findBooks', { query: 'ספר דמיוני' });
    expect(none.data).toEqual([]);
  });

  it('שמות הספרים המדומים תואמים לברירות המחדל של ההגדרות', async () => {
    installMockOtzaria();
    const { DEFAULT_SETTINGS } = await import('../../src/state/settingsStore');
    for (const name of Object.values(DEFAULT_SETTINGS.bookIds)) {
      const res = await call<{ bookId: string }[]>('library.findBooks', { query: name });
      expect(res.data.map((b) => b.bookId), name).toContain(name);
    }
  });

  it('library.getBookToc מחזיר סימנים עם index עולה', async () => {
    installMockOtzaria();
    const res = await call<{ text: string; index: number }[]>('library.getBookToc', { bookId: 'x' });
    const indexes = res.data.map((e) => e.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it('library.getBookContent מחזיר HTML עם bookId ו-offset', async () => {
    installMockOtzaria();
    const res = await call<string>('library.getBookContent', { bookId: 'משנה ברורה', offset: 42 });
    expect(res.data).toContain('<h3>');
    expect(res.data).toContain('משנה ברורה');
    expect(res.data).toContain('42');
  });

  it('מתודות reader/feedback/ui מחזירות הצלחה', async () => {
    installMockOtzaria();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    for (const m of [
      'reader.openBookAtRef',
      'reader.openBook',
      'feedback.sendEmail',
      'ui.showMessage',
      'ui.showSuccess',
      'ui.showError',
    ]) {
      expect((await call<boolean>(m)).success, m).toBe(true);
    }
  });

  it('מתודות התראות ולוח שנה נתמכות', async () => {
    installMockOtzaria();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await call<{ granted: boolean }>('notifications.checkPermissions')).data.granted).toBe(true);
    expect((await call<{ granted: boolean }>('notifications.requestPermissions')).data.granted).toBe(true);
    expect((await call<{ id: number }>('notifications.scheduleSystem', { id: 5 })).data).toEqual({ id: 5 });
    expect((await call<boolean>('notifications.cancelAll')).success).toBe(true);
    expect((await call<boolean>('publishedData.upsert')).success).toBe(true);
    expect((await call<boolean>('publishedData.remove')).success).toBe(true);
    expect((await call<unknown[]>('publishedData.listOwn')).data).toEqual([]);
  });

  it('app.getTheme עוקב אחר מצב ה-dark-mode של ה-body', async () => {
    installMockOtzaria();
    expect((await call<{ mode: string }>('app.getTheme')).data.mode).toBe('light');
    document.body.classList.add('dark-mode');
    expect((await call<{ mode: string }>('app.getTheme')).data.mode).toBe('dark');
  });

  it('app.getGrantedPermissions מחזיר את הרשאות ה-boot', async () => {
    installMockOtzaria();
    const res = await call<string[]>('app.getGrantedPermissions');
    expect(res.data).toEqual(createMockBootPayload().permissions);
  });

  it('מתודה לא מוכרת מחזירה כשל עם קוד', async () => {
    installMockOtzaria();
    const res = await call('does.not.exist');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('error.unknown_method');
    expect(res.error?.message).toBe('does.not.exist');
  });

  it('משדר plugin.boot לאחר tick', async () => {
    vi.useFakeTimers();
    installMockOtzaria();
    const cb = vi.fn();
    window.Otzaria.on('plugin.boot', cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ plugin: expect.anything() }));
  });

  it('off מסיר מאזין', () => {
    vi.useFakeTimers();
    installMockOtzaria();
    const cb = vi.fn();
    window.Otzaria.on('plugin.boot', cb);
    window.Otzaria.off('plugin.boot', cb);
    vi.advanceTimersByTime(1);
    expect(cb).not.toHaveBeenCalled();
  });

  it('__toggleTheme משדר theme.changed עם המצב ההפוך', () => {
    installMockOtzaria();
    const cb = vi.fn();
    window.Otzaria.on('theme.changed', cb);
    (window as unknown as { __toggleTheme: () => void }).__toggleTheme();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ mode: 'dark' }));
    document.body.classList.add('dark-mode');
    (window as unknown as { __toggleTheme: () => void }).__toggleTheme();
    expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'light' }));
  });
});
