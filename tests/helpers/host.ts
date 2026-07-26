// host מדומה של אוצריא לטסטים: מתעד את כל הקריאות ומאפשר להגדיר תשובה לכל מתודה.

import { vi } from 'vitest';
import type { OtzariaResponse } from '../../src/otzaria/otzaria_plugin';

export interface HostCall {
  method: string;
  payload: Record<string, unknown>;
}

export type Handler = (payload: Record<string, unknown>) => unknown;

/** ערך תשובה למתודה: פונקציה (מקבלת payload) או ערך קבוע. */
export type HandlerEntry =
  | Handler
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | Record<string, unknown>;

export interface FakeHost {
  calls: HostCall[];
  /** רק שמות המתודות, לפי הסדר */
  methods(): string[];
  callsTo(method: string): HostCall[];
  /** קביעת תשובת success לקריאה (או פונקציה שמחזירה data) */
  on(method: string, handler: HandlerEntry): void;
  /** קביעת כשל (success:false) לקריאה */
  fail(method: string, code?: string, message?: string): void;
  /** זריקת חריגה מתוך window.Otzaria.call */
  throws(method: string, error?: Error): void;
  emit(event: string, detail: unknown): void;
  listenerCount(event: string): number;
  uninstall(): void;
}

/** מתקין window.Otzaria מדומה. handlers ראשוניים אופציונליים. */
export function installFakeHost(handlers: Record<string, HandlerEntry> = {}): FakeHost {
  const calls: HostCall[] = [];
  const map = new Map<string, HandlerEntry>(Object.entries(handlers));
  const failures = new Map<string, { code: string; message: string }>();
  const throwers = new Map<string, Error>();
  const listeners: Record<string, ((detail: unknown) => void)[]> = {};

  const call = vi.fn(
    async <T>(method: string, payload: Record<string, unknown> = {}): Promise<OtzariaResponse<T>> => {
      calls.push({ method, payload });
      const thrown = throwers.get(method);
      if (thrown) throw thrown;
      const failure = failures.get(method);
      if (failure) {
        return { success: false, data: null as T, error: failure };
      }
      if (!map.has(method)) {
        return {
          success: false,
          data: null as T,
          error: { code: 'error.unknown_method', message: method },
        };
      }
      const entry = map.get(method);
      const data = typeof entry === 'function' ? (entry as Handler)(payload) : entry;
      return { success: true, data: data as T, error: null };
    },
  );

  const host: FakeHost = {
    calls,
    methods: () => calls.map((c) => c.method),
    callsTo: (method) => calls.filter((c) => c.method === method),
    on(method, handler) {
      map.set(method, handler);
      failures.delete(method);
      throwers.delete(method);
    },
    fail(method, code = 'error.failed', message = '') {
      failures.set(method, { code, message });
    },
    throws(method, error = new Error('bridge crashed')) {
      throwers.set(method, error);
    },
    emit(event, detail) {
      (listeners[event] ?? []).forEach((l) => l(detail));
    },
    listenerCount: (event) => (listeners[event] ?? []).length,
    uninstall() {
      delete (window as { Otzaria?: unknown }).Otzaria;
    },
  };

  window.Otzaria = {
    call: call as unknown as typeof window.Otzaria.call,
    on: (event: string, cb: (detail: unknown) => void) => {
      (listeners[event] ??= []).push(cb);
    },
    off: (event: string, cb: (detail: unknown) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((l) => l !== cb);
    },
  };

  return host;
}

/** ברירות מחדל שמאפשרות לאפליקציה לעלות במלואה בטסטים. */
export function defaultHandlers(): Record<string, HandlerEntry> {
  const store = new Map<string, unknown>();
  return {
    'storage.get': (p) => store.get(String(p.key)) ?? null,
    'storage.set': (p) => {
      store.set(String(p.key), p.value);
      return true;
    },
    'storage.remove': (p) => {
      store.delete(String(p.key));
      return true;
    },
    'storage.list': () => [...store.keys()],
    'library.findBooks': () => [],
    'library.getBookToc': () => [],
    'library.getBookContent': () => '',
    'reader.openBookAtRef': () => true,
    'reader.openBook': () => true,
    'ui.showMessage': () => true,
    'ui.showError': () => true,
    'ui.showSuccess': () => true,
    'notifications.checkPermissions': () => ({ granted: true, initialized: true }),
    'notifications.requestPermissions': () => ({ granted: true }),
    'notifications.sendSystem': () => ({ id: 1 }),
    'notifications.scheduleSystem': () => ({ id: 1 }),
    'notifications.cancelAll': () => true,
    'notifications.showInApp': () => true,
    'publishedData.upsert': () => true,
    'publishedData.remove': () => true,
    'publishedData.listOwn': () => [],
    'feedback.sendEmail': () => true,
    'app.getTheme': () => undefined,
  };
}
