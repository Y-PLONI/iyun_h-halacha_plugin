// ספר מדומה שמתנהג כמו אוצריא: getBookToc מחזיר מספרי שורות, getBookContent חותך תווים
// (offset/limit/section) — אותו מימוש של ה-mock לפיתוח, שמשחזר את ה-host.

import { sliceBookContent, tocFromLines } from '../../src/otzaria/mockSdk';
import { toGematria } from '../../src/export/formDocx';
import type { FakeHost } from './host';

/** "סימן תקפא" — כמו כותרות הסימנים בספרי אוצריא (ללא גרשיים). */
export const siman = (n: number): string => `סימן ${toGematria(n).replace(/["']/g, '')}`;

/** שורות ספר: כותרת, מחבר, הקדמה ארוכה, ואז <h2> לכל סימן ואחריו שורות התוכן שלו. */
export function simanimLines(
  numbers: number[],
  body: (n: number) => string[] = (n) => [`<b>דיבור המתחיל</b> תוכן ${siman(n)}`],
): string[] {
  // הקדמה ארוכה: קריאה לפי offset=מספר שורה נופלת בתוכה (הבאג שתוקן)
  const lines = ['<h1>ספר לדוגמה</h1>', 'מחבר', '<h2>הקדמה</h2>', 'דברי הקדמה '.repeat(2000)];
  for (const n of numbers) lines.push(`<h2>${siman(n)}</h2>`, ...body(n));
  return lines;
}

/** מתקין את הספר ב-host המדומה (getBookToc + getBookContent). */
export function installBook(host: FakeHost, lines: string[]): void {
  const raw = lines.join('\n');
  host.on('library.getBookToc', () => tocFromLines(lines));
  host.on('library.getBookContent', (p) => sliceBookContent(raw, p));
}
