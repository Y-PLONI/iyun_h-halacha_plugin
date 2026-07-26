import { describe, expect, it, vi } from 'vitest';
import {
  callOtzaria,
  callOtzariaSafe,
  hasOtzaria,
  offOtzaria,
  onOtzaria,
  showError,
  showMessage,
  showSuccess,
} from '../../src/otzaria/sdk';
import { installFakeHost } from '../helpers/host';

describe('hasOtzaria', () => {
  it('שקר ללא host', () => {
    expect(hasOtzaria()).toBe(false);
  });

  it('אמת כשה-host מותקן', () => {
    installFakeHost();
    expect(hasOtzaria()).toBe(true);
  });
});

describe('callOtzaria', () => {
  it('מחזיר data בהצלחה', async () => {
    installFakeHost({ 'app.info': { version: '1.0' } });
    await expect(callOtzaria('app.info')).resolves.toEqual({ version: '1.0' });
  });

  it('מעביר payload ל-host, וברירת מחדל אובייקט ריק', async () => {
    const host = installFakeHost({ 'x.y': () => true });
    await callOtzaria('x.y', { a: 1 });
    await callOtzaria('x.y');
    expect(host.callsTo('x.y').map((c) => c.payload)).toEqual([{ a: 1 }, {}]);
  });

  it('זורק כשאין SDK', async () => {
    await expect(callOtzaria('x.y')).rejects.toThrow('error.sdk_unavailable');
  });

  it('זורק עם קוד והודעה כשה-host מחזיר כשל', async () => {
    const host = installFakeHost();
    host.fail('x.y', 'error.permission_denied', 'אין הרשאה');
    await expect(callOtzaria('x.y')).rejects.toThrow('error.permission_denied: אין הרשאה');
  });

  it('זורק error.unknown כשאין פרטי שגיאה', async () => {
    const host = installFakeHost();
    vi.mocked(window.Otzaria.call).mockResolvedValueOnce(undefined as never);
    await expect(callOtzaria('x.y')).rejects.toThrow('error.unknown');
    host.uninstall();
  });

  it('מעביר הלאה חריגה מה-bridge', async () => {
    const host = installFakeHost();
    host.throws('x.y', new Error('bridge down'));
    await expect(callOtzaria('x.y')).rejects.toThrow('bridge down');
  });
});

describe('callOtzariaSafe', () => {
  it('מחזיר את הערך בהצלחה', async () => {
    installFakeHost({ 'x.y': 42 });
    await expect(callOtzariaSafe('x.y', {}, 0)).resolves.toBe(42);
  });

  it('מחזיר fallback בכשל, בחריגה וללא host', async () => {
    const host = installFakeHost();
    host.fail('a');
    host.throws('b');
    await expect(callOtzariaSafe('a', {}, 'ברירת מחדל')).resolves.toBe('ברירת מחדל');
    await expect(callOtzariaSafe('b', {}, 'ברירת מחדל')).resolves.toBe('ברירת מחדל');
    host.uninstall();
    await expect(callOtzariaSafe('c', {}, 'ברירת מחדל')).resolves.toBe('ברירת מחדל');
  });
});

describe('אירועים', () => {
  it('onOtzaria/offOtzaria נרשמים ומתנתקים', () => {
    const host = installFakeHost();
    const cb = vi.fn();
    onOtzaria('theme.changed', cb);
    expect(host.listenerCount('theme.changed')).toBe(1);
    host.emit('theme.changed', { mode: 'dark' });
    expect(cb).toHaveBeenCalledWith({ mode: 'dark' });
    offOtzaria('theme.changed', cb);
    expect(host.listenerCount('theme.changed')).toBe(0);
  });

  it('רישום ללא host אינו זורק', () => {
    expect(() => onOtzaria('theme.changed', () => {})).not.toThrow();
    expect(() => offOtzaria('theme.changed', () => {})).not.toThrow();
  });
});

describe('הודעות UI', () => {
  it('showMessage/showSuccess/showError קוראים למתודות ה-host', async () => {
    const host = installFakeHost({ 'ui.showMessage': true, 'ui.showSuccess': true, 'ui.showError': true });
    await showMessage('הודעה');
    await showSuccess('הצלחה');
    await showError('שגיאה');
    expect(host.callsTo('ui.showMessage')[0].payload).toEqual({ message: 'הודעה' });
    expect(host.callsTo('ui.showSuccess')[0].payload).toEqual({ message: 'הצלחה' });
    expect(host.callsTo('ui.showError')[0].payload).toEqual({ message: 'שגיאה' });
  });

  it('showError נופל ל-console.error ללא host', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await showError('נכשל');
    expect(spy).toHaveBeenCalledWith('נכשל');
  });

  it('showError אינו זורק כשה-host מחזיר כשל', async () => {
    const host = installFakeHost();
    host.fail('ui.showError');
    await expect(showError('נכשל')).resolves.toBeUndefined();
  });

  it('showMessage אינו זורק כשהמתודה אינה נתמכת', async () => {
    installFakeHost();
    await expect(showMessage('הודעה')).resolves.toBeUndefined();
  });
});
