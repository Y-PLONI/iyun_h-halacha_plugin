import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// ── פוליפילים ל-jsdom ──

// jsdom אינו מממש execCommand (בשימוש ב-AnswerEditor: bold/italic/insertText…).
// המימוש כאן רק מתעד קריאות ומדמה insertText, כדי שהזרימה תהיה בדיקה אמיתית.
type ExecCommand = (command: string, showUI?: boolean, value?: string) => boolean;
const execCommandImpl: ExecCommand = (command, _showUI, value) => {
  if (command === 'insertText' && value !== undefined) {
    const el = document.activeElement as HTMLElement | null;
    if (el && el.isContentEditable) el.append(document.createTextNode(value));
  }
  return true;
};

// jsdom אינו מממש PointerEvent (בשימוש בגרירת המפרידים ב-SplitPane).
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }
  Object.defineProperty(globalThis, 'PointerEvent', {
    value: PointerEventShim,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventShim,
    configurable: true,
    writable: true,
  });
}

// ה-Blob של jsdom אינו מממש arrayBuffer()/text() — משלימים דרך FileReader,
// כדי שהטסטים יוכלו לקרוא את חבילות ה-DOCX שנבנו.
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  const readAs = <T>(blob: Blob, method: 'readAsArrayBuffer' | 'readAsText'): Promise<T> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as T);
      reader.onerror = () => reject(reader.error);
      reader[method](blob);
    });
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return readAs<ArrayBuffer>(this, 'readAsArrayBuffer');
  };
  Blob.prototype.text = function text(this: Blob) {
    return readAs<string>(this, 'readAsText');
  };
}

// jsdom אינו מממש createObjectURL/revokeObjectURL (בשימוש ב-downloadBlob).
const objectUrls = new Map<string, Blob>();
let urlCounter = 0;

// ב-Node 26 ה-global `localStorage` המובנה מוסתר ללא --localstorage-file, ומאפיל על
// זה של jsdom. מתקינים מימוש בזיכרון תואם-Storage כדי ש-storage.ts (מסלול ה-dev)
// ייבדק באמת.
// המימוש מבוסס Proxy כדי שגם `Object.keys(localStorage)` יעבוד (storageList מסתמך על כך).
function createMemoryStorage(): Storage {
  const data: Record<string, string> = {};
  const api: Record<string, unknown> = {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: unknown) => {
      data[String(key)] = String(value);
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k];
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
  };
  return new Proxy(data, {
    get: (target, prop) => {
      if (prop === 'length') return Object.keys(target).length;
      if (typeof prop === 'string' && prop in api) return api[prop];
      return target[prop as string];
    },
    has: (target, prop) => prop in target || (typeof prop === 'string' && prop in api),
  }) as unknown as Storage;
}

if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true });
}

beforeEach(() => {
  document.execCommand = vi.fn(execCommandImpl);
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:mock/${++urlCounter}`;
    objectUrls.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    objectUrls.delete(url);
  });
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('style');
  document.body.className = '';
  localStorage.clear();
  objectUrls.clear();
  delete (window as { Otzaria?: unknown }).Otzaria;
});

/** ה-Blob-ים שנרשמו דרך URL.createObjectURL (לבדיקת הורדות). */
export function trackedObjectUrls(): Map<string, Blob> {
  return objectUrls;
}
