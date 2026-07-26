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
            primaryContainer: '#4F378B',
            onPrimaryContainer: '#EADDFF',
            secondary: '#CCC2DC',
            onSecondary: '#332D41',
            secondaryContainer: '#4A4458',
            onSecondaryContainer: '#E8DEF8',
            tertiary: '#EFB8C8',
            onTertiary: '#492532',
            tertiaryContainer: '#633B48',
            onTertiaryContainer: '#FFD8E4',
            surface: '#141218',
            onSurface: '#E6E1E5',
            onSurfaceVariant: '#CAC4D0',
            surfaceContainerLowest: '#0F0D13',
            surfaceContainerLow: '#1D1B20',
            surfaceContainer: '#211F26',
            surfaceContainerHigh: '#2B2930',
            surfaceContainerHighest: '#36343B',
            error: '#F2B8B5',
            onError: '#601410',
            errorContainer: '#8C1D18',
            onErrorContainer: '#F9DEDC',
            outline: '#938F99',
            outlineVariant: '#49454F',
            inverseSurface: '#E6E1E5',
            onInverseSurface: '#322F35',
            inversePrimary: '#6750A4',
            scrim: '#000000',
          }
        : {
            primary: '#6750A4',
            onPrimary: '#FFFFFF',
            primaryContainer: '#EADDFF',
            onPrimaryContainer: '#21005D',
            secondary: '#625B71',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#E8DEF8',
            onSecondaryContainer: '#1D192B',
            tertiary: '#7D5260',
            onTertiary: '#FFFFFF',
            tertiaryContainer: '#FFD8E4',
            onTertiaryContainer: '#31111D',
            surface: '#FEF7FF',
            onSurface: '#1D1B20',
            onSurfaceVariant: '#49454F',
            surfaceContainerLowest: '#FFFFFF',
            surfaceContainerLow: '#F7F2FA',
            surfaceContainer: '#F3EDF7',
            surfaceContainerHigh: '#ECE6F0',
            surfaceContainerHighest: '#E6E0E9',
            error: '#B3261E',
            onError: '#FFFFFF',
            errorContainer: '#F9DEDC',
            onErrorContainer: '#410E0B',
            outline: '#79747E',
            outlineVariant: '#CAC4D0',
            inverseSurface: '#322F35',
            onInverseSurface: '#F5EFF7',
            inversePrimary: '#D0BCFF',
            scrim: '#000000',
          },
    typography: {
      fontFamily: 'FrankRuhlCLM',
      fontSize: 18,
      lineHeight: 1.6,
      commentatorsFontFamily: 'FrankRuhlCLM',
      commentatorsFontSize: 16,
    },
  };
}

type Listener = (detail: unknown) => void;

export function installMockOtzaria(): void {
  const listeners: Record<string, Listener[]> = {};
  const mockBooks = [
    { bookId: 'שולחן ערוך, אורח חיים', title: 'שולחן ערוך, אורח חיים', topics: ['הלכה'] },
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
        // אוצריא מחזירה HTML — מדמים זאת כדי לבדוק את הרינדור (h3/b וכו').
        return ok(
          `<h3>סעיף א</h3>` +
            `<b>כיוצא להקנות וכו'</b> - תצוגת פיתוח עבור ${String(payload?.bookId ?? '')} ` +
            `(offset ${String(payload?.offset ?? 0)}). בסביבת אוצריא יוחזר כאן הטקסט האמיתי מהספר. ` +
            `<sup>1</sup> ועיין עוד בהמשך. `.repeat(4),
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
      case 'notifications.checkPermissions':
        return ok({ granted: true, initialized: true }) as OtzariaResponse<T>;
      case 'notifications.requestPermissions':
        return ok({ granted: true }) as OtzariaResponse<T>;
      case 'notifications.sendSystem':
      case 'notifications.scheduleSystem':
        console.info('[mock]', method, payload);
        return ok({ id: Number(payload?.id ?? 1) }) as OtzariaResponse<T>;
      case 'notifications.cancel':
      case 'notifications.cancelAll':
      case 'notifications.showInApp':
        console.info('[mock]', method, payload);
        return ok(true) as OtzariaResponse<T>;
      case 'publishedData.upsert':
      case 'publishedData.remove':
        console.info('[mock]', method, payload);
        return ok(true) as OtzariaResponse<T>;
      case 'publishedData.listOwn':
        return ok([]) as OtzariaResponse<T>;
      case 'app.getGrantedPermissions':
        return ok(createMockBootPayload().permissions) as OtzariaResponse<T>;
      case 'app.getTheme': {
        const mode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        return ok(createMockTheme(mode)) as OtzariaResponse<T>;
      }
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
