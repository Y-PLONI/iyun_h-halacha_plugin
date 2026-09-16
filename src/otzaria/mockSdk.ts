// Mock של Otzaria SDK לפיתוח בדפדפן רגיל (import.meta.env.DEV).
// מאפשר להריץ את התוסף ללא host אמיתי. storage.* ממומש כאן מעל localStorage — המוק
// מתקין window.Otzaria, ולכן ה-fallback שב-storage.ts אינו נתפס.

import type { BootPayload, OtzariaResponse, ThemePayload, TocEntry } from './otzaria_plugin';
import { toGematria } from '../export/formDocx';

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

// ── ספר בפורמט אוצריא: שורות HTML מאוחות ב-\n, כותרת <hN> בשורה משלה ──
// שתי הפונקציות משחזרות את ה-host (plugin_bridge_adapter.dart, TocParser) ומשמשות גם בטסטים.

/** getBookToc: לכל שורת כותרת — { text: ללא תגיות, index: מספר השורה, level: N }. */
export function tocFromLines(lines: string[]): TocEntry[] {
  const toc: TocEntry[] = [];
  lines.forEach((line, index) => {
    const m = /^<h([1-6])/i.exec(line.trimStart());
    if (!m) return;
    const text = line.replace(/<[^>]*>/g, '').trim();
    if (text) toc.push({ text, index, level: Number(m[1]) });
  });
  return toc;
}

/**
 * getBookContent: offset/limit בתווים (limit עד 5000, ברירת מחדל 1000). section מאותר
 * ב-indexOf ו-offset נספר ממנו; section שלא נמצא — מתעלמים ממנו בשקט (כמו ב-host).
 */
export function sliceBookContent(raw: string, p: Record<string, unknown> = {}): string {
  const limit = Math.min(typeof p.limit === 'number' ? p.limit : 1000, 5000);
  let start = typeof p.offset === 'number' ? p.offset : 0;
  if (typeof p.section === 'string' && p.section) {
    const idx = raw.indexOf(p.section);
    if (idx >= 0) start += idx;
  }
  const clamp = (n: number) => Math.min(Math.max(n, 0), raw.length);
  return raw.substring(clamp(start), clamp(start + limit));
}

const mockBookCache = new Map<string, { lines: string[]; raw: string }>();

function mockBook(bookId: string): { lines: string[]; raw: string } {
  let book = mockBookCache.get(bookId);
  if (!book) {
    const lines = [`<h1>${bookId}</h1>`, '<h2>הקדמה</h2>', 'הקדמת הספר — תצוגת פיתוח.'];
    for (let n = 1; n <= 697; n++) {
      const siman = `סימן ${toGematria(n).replace(/["']/g, '')}`;
      lines.push(
        `<h2>${siman}</h2>`,
        '<h3>סעיף א</h3>',
        `<b>דיבור המתחיל</b> - תצוגת פיתוח עבור ${bookId}, ${siman}. ` +
          'בסביבת אוצריא יוחזר כאן הטקסט האמיתי מהספר. <sup>1</sup>',
      );
    }
    book = { lines, raw: lines.join('\n') };
    mockBookCache.set(bookId, book);
  }
  return book;
}

/** קידומת מפתחות ה-storage של המוק (מקבילה לזו שב-storage.ts). */
const MOCK_STORAGE_PREFIX = 'iyun-halacha:';

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
        return ok(tocFromLines(mockBook(String(payload?.bookId ?? '')).lines)) as OtzariaResponse<T>;
      case 'library.getBookContent':
        return ok(
          sliceBookContent(mockBook(String(payload?.bookId ?? '')).raw, payload),
        ) as OtzariaResponse<T>;
      // storage.* — נשמר ב-localStorage תחת קידומת משלו, כדי לדמות את ה-host
      // שעושה JSON encode/decode בעצמו (מקבלים/מחזירים אובייקט גולמי).
      case 'storage.get': {
        const raw = localStorage.getItem(MOCK_STORAGE_PREFIX + String(payload?.key ?? ''));
        return ok(raw === null ? null : JSON.parse(raw)) as OtzariaResponse<T>;
      }
      case 'storage.set': {
        localStorage.setItem(
          MOCK_STORAGE_PREFIX + String(payload?.key ?? ''),
          JSON.stringify(payload?.value ?? null),
        );
        return ok(true) as OtzariaResponse<T>;
      }
      case 'storage.remove': {
        localStorage.removeItem(MOCK_STORAGE_PREFIX + String(payload?.key ?? ''));
        return ok(true) as OtzariaResponse<T>;
      }
      case 'storage.list':
        return ok(
          Object.keys(localStorage)
            .filter((k) => k.startsWith(MOCK_STORAGE_PREFIX))
            .map((k) => k.slice(MOCK_STORAGE_PREFIX.length)),
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
