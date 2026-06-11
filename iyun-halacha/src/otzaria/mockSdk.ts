// Mock של Otzaria SDK לפיתוח בדפדפן רגיל (import.meta.env.DEV).
// מאפשר להריץ את התוסף ללא host אמיתי. storage נופל ל-localStorage דרך storage.ts.

import type { BootPayload, OtzariaResponse, ThemePayload } from './otzaria_plugin';

export function createMockBootPayload(): BootPayload {
  return {
    plugin: { id: 'com.chadbedera.iyun-halacha', version: '0.1.0' },
    app: {
      version: '0.9.92',
      platform: 'macos',
      locale: 'he',
      textDirection: 'rtl',
    },
    theme: createMockTheme('light'),
    permissions: [
      'app.info.read',
      'library.books.read',
      'library.content.read',
      'reader.open',
      'plugin.storage.read',
      'plugin.storage.write',
      'ui.feedback',
      'feedback.send_email',
      'events.subscribe:theme.changed',
    ],
  };
}

export function createMockTheme(mode: 'light' | 'dark'): ThemePayload {
  return {
    mode,
    colorScheme:
      mode === 'dark'
        ? {
            primary: '#D0BCFF',
            onPrimary: '#381E72',
            secondary: '#CCC2DC',
            onSecondary: '#332D41',
            surface: '#1C1B1F',
            onSurface: '#E6E1E5',
            surfaceContainerHighest: '#36343B',
            error: '#F2B8B5',
            onError: '#601410',
            outline: '#938F99',
          }
        : {
            primary: '#6750A4',
            onPrimary: '#FFFFFF',
            secondary: '#625B71',
            onSecondary: '#FFFFFF',
            surface: '#FFFBFE',
            onSurface: '#1C1B1F',
            surfaceContainerHighest: '#E6E0E9',
            error: '#B3261E',
            onError: '#FFFFFF',
            outline: '#79747E',
          },
    typography: {
      fontFamily: 'Frank Ruhl Libre',
      fontSize: 18,
      lineHeight: 1.5,
      commentatorsFontFamily: 'Frank Ruhl Libre',
      commentatorsFontSize: 16,
    },
  };
}

type Listener = (detail: unknown) => void;

export function installMockOtzaria(): void {
  const listeners: Record<string, Listener[]> = {};
  const mockBooks = [
    { bookId: 'שולחן ערוך אורח חיים', title: 'שולחן ערוך אורח חיים', topics: ['הלכה'] },
    { bookId: 'משנה ברורה', title: 'משנה ברורה', topics: ['הלכה'] },
    { bookId: 'ביאור הלכה', title: 'ביאור הלכה', topics: ['הלכה'] },
    { bookId: 'שער הציון', title: 'שער הציון', topics: ['הלכה'] },
  ];

  const call = async <T>(method: string, payload?: Record<string, unknown>): Promise<OtzariaResponse<T>> => {
    const ok = <V>(data: V): OtzariaResponse<V> => ({ success: true, data, error: null });
    switch (method) {
      case 'library.findBooks': {
        const q = String(payload?.query ?? '');
        return ok(mockBooks.filter((b) => b.title.includes(q))) as OtzariaResponse<T>;
      }
      case 'library.getBookToc':
        return ok([
          { text: 'סימן תקלט', index: 0, level: 1 },
          { text: 'סימן תקמ', index: 1200, level: 1 },
          { text: 'סימן תקמא', index: 2400, level: 1 },
          { text: 'סימן תקמב', index: 3600, level: 1 },
        ]) as OtzariaResponse<T>;
      case 'library.getBookContent':
        return ok(
          `[תצוגת פיתוח] תוכן לדוגמה עבור ${String(payload?.bookId ?? '')} ` +
            `מ-offset ${String(payload?.offset ?? 0)}. ` +
            'בסביבת אוצריא יוחזר כאן הטקסט האמיתי מהספר. '.repeat(6),
        ) as OtzariaResponse<T>;
      case 'reader.openBookAtRef':
      case 'reader.openBook':
        console.info('[mock] open book', payload);
        return ok(true) as OtzariaResponse<T>;
      case 'feedback.sendEmail':
        console.info('[mock] sendEmail', payload);
        return ok(true) as OtzariaResponse<T>;
      case 'ui.showMessage':
      case 'ui.showSuccess':
      case 'ui.showError':
        console.info('[mock]', method, payload);
        return ok(true) as OtzariaResponse<T>;
      case 'app.getGrantedPermissions':
        return ok(createMockBootPayload().permissions) as OtzariaResponse<T>;
      default:
        return { success: false, data: null as T, error: { code: 'error.unknown_method', message: method } };
    }
  };

  window.Otzaria = {
    call: call as typeof window.Otzaria.call,
    on: (event: string, cb: Listener) => {
      (listeners[event] ??= []).push(cb);
    },
    off: (event: string, cb: Listener) => {
      listeners[event] = (listeners[event] ?? []).filter((l) => l !== cb);
    },
  };

  // משדרים boot אחרי tick כדי לדמות התנהגות host
  setTimeout(() => {
    (listeners['plugin.boot'] ?? []).forEach((l) => l(createMockBootPayload()));
  }, 0);

  // קיצור דרך לבדיקת theme.changed מה-console
  (window as unknown as { __toggleTheme?: () => void }).__toggleTheme = () => {
    const mode = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    (listeners['theme.changed'] ?? []).forEach((l) => l(createMockTheme(mode)));
  };
}
