import { describe, expect, it, vi } from 'vitest';
import { sendMail } from '../../src/otzaria/mail';
import { installFakeHost } from '../helpers/host';

/** window.location.href אינו ניתן לכתיבה ב-jsdom — מחליפים את האובייקט. */
function captureLocation(): { href: string } {
  const fake = { href: '' };
  Object.defineProperty(window, 'location', { value: fake, writable: true, configurable: true });
  return fake;
}

const input = { to: 'a@b.co.il', subject: 'נושא', body: 'גוף ההודעה' };

describe('sendMail', () => {
  it('שולח דרך feedback.sendEmail כשיש host', async () => {
    const host = installFakeHost({ 'feedback.sendEmail': true });
    const loc = captureLocation();
    await expect(sendMail(input)).resolves.toBe(true);
    expect(host.callsTo('feedback.sendEmail')[0].payload).toEqual({
      to: 'a@b.co.il',
      subject: 'נושא',
      body: 'גוף ההודעה',
      includeSystemInfo: false,
    });
    expect(loc.href).toBe('');
  });

  it('נופל ל-mailto כשה-host מחזיר false', async () => {
    installFakeHost({ 'feedback.sendEmail': false });
    const loc = captureLocation();
    await expect(sendMail(input)).resolves.toBe(true);
    expect(loc.href).toContain('mailto:');
    expect(loc.href).toContain(encodeURIComponent('נושא'));
  });

  it('נופל ל-mailto כשהקריאה נכשלת', async () => {
    const host = installFakeHost();
    host.fail('feedback.sendEmail', 'error.permission_denied');
    const loc = captureLocation();
    await sendMail(input);
    expect(loc.href).toContain('mailto:a%40b.co.il');
  });

  it('נופל ל-mailto ללא host', async () => {
    const loc = captureLocation();
    await expect(sendMail(input)).resolves.toBe(true);
    expect(loc.href).toBe(
      `mailto:${encodeURIComponent('a@b.co.il')}?subject=${encodeURIComponent('נושא')}&body=${encodeURIComponent('גוף ההודעה')}`,
    );
  });

  it('מקודד תווים מיוחדים ושורות בגוף ההודעה', async () => {
    const loc = captureLocation();
    await sendMail({ to: 'x@y.z', subject: 'א&ב', body: 'שורה 1\nשורה 2' });
    expect(loc.href).toContain(encodeURIComponent('א&ב'));
    expect(loc.href).toContain('%0A');
    expect(loc.href).not.toContain('\n');
  });

  it('חריגה מה-bridge אינה מפילה את השליחה', async () => {
    const host = installFakeHost();
    host.throws('feedback.sendEmail', new Error('crash'));
    const loc = captureLocation();
    await expect(sendMail(input)).resolves.toBe(true);
    expect(loc.href).toContain('mailto:');
    expect(vi.mocked(window.Otzaria.call)).toHaveBeenCalled();
  });
});
