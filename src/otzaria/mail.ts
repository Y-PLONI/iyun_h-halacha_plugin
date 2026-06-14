// שליחת מייל דרך ה-host (feedback.sendEmail) עם fallback ל-mailto.

import { callOtzaria, hasOtzaria } from './sdk';

export interface MailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * פותח מייל לשליחה. מנסה feedback.sendEmail; אם נכשל או שאין host —
 * נופל ל-mailto. mailto אינו מצרף קבצים, ולכן יש להציג הנחיה למשתמש.
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  if (hasOtzaria()) {
    try {
      const ok = await callOtzaria<boolean>('feedback.sendEmail', {
        to: input.to,
        subject: input.subject,
        body: input.body,
        includeSystemInfo: false,
      });
      if (ok) return true;
    } catch {
      // ממשיכים ל-fallback
    }
  }
  const href = `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(
    input.subject,
  )}&body=${encodeURIComponent(input.body)}`;
  window.location.href = href;
  return true;
}
