// זרימת ה-boot של התוסף: theme, טעינת הגדרות/תשובות/מבחנים, responsive, שמירה בסגירה.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { createMockTheme } from '../src/otzaria/mockSdk';
import { defaultHandlers, installFakeHost, type FakeHost } from './helpers/host';
import { prepareExams } from './helpers/app';

let host: FakeHost;

beforeAll(async () => {
  // המרת ה-docx מתבצעת פעם אחת מראש, כדי שהטסטים יוכלו להשתמש בטיימרים מדומים.
  await prepareExams();
});

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
});

/** מרנדר את האפליקציה ומשדר plugin.boot כמו ה-host האמיתי. */
async function bootApp(boot: Record<string, unknown> = {}) {
  const utils = render(<App />);
  await act(async () => {
    host.emit('plugin.boot', boot);
  });
  await waitFor(() => expect(screen.queryByText('טוען…')).not.toBeInTheDocument());
  return utils;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('App — עליית התוסף', () => {
  it('מציג מסך טעינה ואז את מסך ההספקים', async () => {
    render(<App />);
    expect(screen.getByText('טוען…')).toBeInTheDocument();
    await act(async () => {
      host.emit('plugin.boot', {});
    });
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('עיון ההלכה'));
  });

  it('מאתחל גם אם אירוע ה-boot פוספס (נפילה לטיימר)', async () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.getByText('טוען…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.queryByText('טוען…')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('טוען הגדרות, תשובות ומבחנים', async () => {
    await bootApp();
    const keys = host.callsTo('storage.get').map((c) => c.payload.key);
    expect(keys).toContain('settings:v1');
    expect(keys).toContain('answers:v2');
    const { getExamDoc } = await import('../src/data/examLoader');
    expect(getExamDoc('issue-0240')).not.toBeNull();
  });

  it('מחיל theme שנשלף מה-host גם ללא אירוע boot', async () => {
    host.on('app.getTheme', () => createMockTheme('dark'));
    render(<App />);
    await waitFor(() => expect(document.body).toHaveClass('dark-mode'));
  });

  it('מגיב לאירוע theme.changed', async () => {
    await bootApp();
    act(() => host.emit('theme.changed', createMockTheme('dark')));
    expect(document.body).toHaveClass('dark-mode');
    act(() => host.emit('theme.changed', createMockTheme('light')));
    expect(document.body).not.toHaveClass('dark-mode');
  });

  it('אירוע plugin.boot עם theme מחיל אותו ומאתחל', async () => {
    host.on('app.getTheme', () => undefined);
    await bootApp({ theme: createMockTheme('dark') });
    expect(document.body).toHaveClass('dark-mode');
  });

  it('מחיל את העדפות הגופן השמורות לאחר טעינה', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'settings:v1',
      value: { uiFontSize: 21, fontMode: 'default' } as never,
    });
    await bootApp();
    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('21px'),
    );
  });

  it('שינוי הגדרות גופן מוחל מיד', async () => {
    await bootApp();
    const { updateSettings } = await import('../src/state/settingsStore');
    act(() => updateSettings({ uiFontSize: 25 }));
    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('25px');
  });

  it('מסיר את המאזינים בפירוק', async () => {
    const { unmount } = await bootApp();
    unmount();
    expect(host.listenerCount('plugin.boot')).toBe(0);
    expect(host.listenerCount('theme.changed')).toBe(0);
  });
});

describe('App — ללא host (דפדפן)', () => {
  it('עולה גם בלי SDK', async () => {
    host.uninstall();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
  });

  it('נופל ל-localStorage לשמירת התשובות', async () => {
    host.uninstall();
    localStorage.setItem(
      'iyun-halacha:answers:v2',
      JSON.stringify({
        schemaVersion: 2,
        updatedAt: '',
        answersByWeek: {
          'issue-0240-w1': {
            issueId: 'issue-0240',
            weekId: 'issue-0240-w1',
            answerHtml: '<p>מ-localStorage</p>',
            answerText: 'מ-localStorage',
            status: 'draft',
            wordCount: 1,
            lastSavedAt: '',
          },
        },
      }),
    );
    render(<App />);
    const { getAnswer } = await import('../src/state/answersStore');
    await waitFor(() => expect(getAnswer('issue-0240-w1')?.answerText).toBe('מ-localStorage'));
  });
});

describe('App — responsive ושמירה', () => {
  it('מסמן מסך צר לפי רוחב החלון', async () => {
    const { appStore } = await import('../src/state/appStore');
    await bootApp();
    expect(appStore.get().isNarrow).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(appStore.get().isNarrow).toBe(true);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(appStore.get().isNarrow).toBe(false);
  });

  it('שומר תשובות לפני סגירת החלון', async () => {
    await bootApp();
    const { updateAnswerContent } = await import('../src/state/answersStore');
    const { getWeek } = await import('../src/data/localData');
    act(() => updateAnswerContent(getWeek('issue-0240-w1')!, '<p>לפני סגירה</p>', 'לפני סגירה'));
    window.dispatchEvent(new Event('beforeunload'));
    await waitFor(() =>
      expect(host.callsTo('storage.set').some((c) => c.payload.key === 'answers:v2')).toBe(true),
    );
  });
});

// נשאר אחרון בקובץ: הטסט טוען עותק טרי של האפליקציה ומחליף את רישום המודולים.
describe('App — תיאום תזכורות ב-boot', () => {
  it('מתזמן התראות לפי ההגדרות השמורות', async () => {
    // מודולים טריים: initReminders מאתחל פעם אחת בלבד לכל חיי המודול
    vi.resetModules();
    // resetModules clears the exam cache; convert fresh documents before testing boot.
    const { loadExams } = await import('../src/data/examLoader');
    await loadExams();
    const { App: FreshApp } = await import('../src/App');
    await window.Otzaria.call('storage.set', {
      key: 'settings:v1',
      value: { remindersEnabled: true, desktopNotifications: true, calendarReminders: false } as never,
    });
    render(<FreshApp />);
    await act(async () => {
      host.emit('plugin.boot', {});
    });
    await waitFor(() => expect(host.callsTo('notifications.scheduleSystem').length).toBeGreaterThan(0));
  });
});
