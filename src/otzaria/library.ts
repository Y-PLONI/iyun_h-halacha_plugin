// טעינת מקורות מאוצריא: איתור ספרים, טעינת תוכן לפי ref, פתיחה בקורא.

import { callOtzaria, callOtzariaSafe } from './sdk';
import type { BookMeta, TocEntry } from './otzaria_plugin';

const MAX_CHUNK = 5000; // library.getBookContent מוגבל ל-5000 תווים לקריאה

export async function findBooks(query: string, limit = 10): Promise<BookMeta[]> {
  return await callOtzariaSafe<BookMeta[]>('library.findBooks', { query, limit }, []);
}

/** נרמול שם ספר להשוואה: הסרת פיסוק (פסיק/גרשיים/נקודה) וצמצום רווחים. */
function normName(s: string): string {
  return s
    .replace(/[",'״׳.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** האם הכותרת היא של מפרש על ספר אחר (למשל "מטה יהונתן על שולחן ערוך"). */
function isCommentaryTitle(title: string): boolean {
  return / על /.test(title);
}

/**
 * בוחר את הספר המתאים ביותר לשם מבוקש מתוך תוצאות findBooks.
 * סדר עדיפויות: התאמה מדויקת (אחרי נרמול פיסוק) → מתחיל בשם → ספר בסיס (לא מפרש) → הראשון.
 * מחזיר null אם אין תוצאות.
 */
function pickBestBook(books: BookMeta[], wantedName: string): BookMeta | null {
  if (!books.length) return null;
  const target = normName(wantedName);
  const wantedIsCommentary = isCommentaryTitle(wantedName);
  const exact = books.find((b) => normName(b.title) === target || b.bookId === wantedName);
  if (exact) return exact;
  const starts = books.find((b) => normName(b.title).startsWith(target));
  if (starts) return starts;
  // הימנעות ממפרשים ("X על Y") כשהשם המבוקש אינו של מפרש — מונע זיהוי שו"ע כפירוש
  if (!wantedIsCommentary) {
    const base = books.find((b) => !isCommentaryTitle(b.title));
    if (base) return base;
  }
  return books[0];
}

/**
 * מנסה לזהות אוטומטית bookId לפי שם מבוקש.
 * מחזיר את ה-bookId אם יש התאמה מדויקת או התאמה יחידה (ללא מפרשים), אחרת null.
 */
export async function autoDetectBookId(wantedName: string): Promise<string | null> {
  const books = await findBooks(wantedName, 10);
  if (books.length === 0) return null;
  const target = normName(wantedName);
  const exact = books.find((b) => normName(b.title) === target || b.bookId === wantedName);
  if (exact) return exact.bookId;
  // התאמה יחידה שמתחילה בשם המבוקש (אחרי נרמול), בלי לכלול מפרשים
  const starts = books.filter(
    (b) => normName(b.title).startsWith(target) && !isCommentaryTitle(b.title),
  );
  if (starts.length === 1) return starts[0].bookId;
  if (books.length === 1) return books[0].bookId;
  return null;
}

export async function getBookToc(bookId: string): Promise<TocEntry[]> {
  return await callOtzariaSafe<TocEntry[]>('library.getBookToc', { bookId }, []);
}

// cache לפתרון שם-ספר -> bookId אמיתי (findBooks). null = חיפשנו ולא נמצא.
const bookIdCache = new Map<string, string | null>();

/**
 * מפענח שם ספר ל-bookId אמיתי דרך library.findBooks.
 * שם התצוגה אינו בהכרח ה-bookId (למשל שו"ע/שעה"צ), לכן חובה לפענח.
 * lenient: אם אין התאמה מדויקת, מחזיר את המועמד הראשון.
 */
export async function resolveBookId(nameOrId: string): Promise<string | null> {
  if (!nameOrId) return null;
  if (bookIdCache.has(nameOrId)) return bookIdCache.get(nameOrId)!;
  const books = await findBooks(nameOrId, 10);
  const resolved = pickBestBook(books, nameOrId)?.bookId ?? null;
  bookIdCache.set(nameOrId, resolved);
  return resolved;
}

/** בוחר את ערך ה-TOC הקרוב ביותר ל-ref נתון (contains / נורמליזציה). */
export function findBestTocEntry(toc: TocEntry[], ref: string): TocEntry | null {
  if (!toc.length || !ref) return null;
  const norm = (s: string) => s.replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim();
  const target = norm(ref);
  // 1. התאמה מדויקת
  let hit = toc.find((e) => norm(e.text) === target);
  if (hit) return hit;
  // 2. הכי ארוך שמוכל ב-ref או שמכיל את ה-ref
  const candidates = toc
    .filter((e) => {
      const t = norm(e.text);
      return t.includes(target) || target.includes(t);
    })
    .sort((a, b) => norm(b.text).length - norm(a.text).length);
  hit = candidates[0];
  return hit ?? null;
}

// תקרת קריאה לטווח אחד: 200 אלף תווים. הטווח השבועי הגדול ביותר בגליונות הוא כ-37 אלף.
const MAX_RANGE_CHUNKS = 40;

const LETTER_VALUES: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
};

/** מספר הסימן מתוך "סימן תקפא" / "סימן תקפ״א". null אם הטקסט אינו כותרת סימן. */
export function simanNumber(text: string): number | null {
  const m = /^סימן ([א-ת]+)$/.exec(text.replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim());
  if (!m) return null;
  let n = 0;
  for (const ch of m[1]) n += LETTER_VALUES[ch] ?? 0;
  return n || null;
}

interface TocRange {
  /** הכותרת הראשונה בטווח שקיימת בספר */
  first: TocEntry;
  /** האם כותרת (טקסט נקי) שייכת לטווח — כותרת מחוצה לו מסיימת את הטעינה */
  inRange: (headingText: string) => boolean;
}

/**
 * בוחר מתוך ה-TOC את הכותרת שממנה מתחילים. ref מסוג "סימן X" מושווה לפי ערך מספרי,
 * כך שסימן שחסר בספר (ביאור הלכה אינו מפרש כל סימן) מוחלף בסימן הקיים הראשון בטווח.
 */
function pickTocRange(toc: TocEntry[], startRef: string, endRef?: string): TocRange | null {
  const a = simanNumber(startRef);
  const b = endRef ? simanNumber(endRef) : a;
  if (a !== null && b !== null) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const inRange = (t: string) => {
      const n = simanNumber(t);
      return n !== null && n >= lo && n <= hi;
    };
    const first = toc.find((e) => inRange(e.text));
    return first ? { first, inRange } : null;
  }
  const norm = (s: string) => s.replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim();
  const first = toc.find((e) => norm(e.text) === norm(startRef));
  return first ? { first, inRange: (t) => norm(t) === norm(first.text) } : null;
}

/**
 * קורא את הקטע הראשון החל משורת הכותרת עצמה, דרך section.
 * אוצריא מאתרת את section ב-indexOf, וכשהוא לא נמצא היא מחזירה בשקט את תחילת הספר —
 * לכן מאמתים שהטקסט שחזר אכן פותח בכותרת. רמת ה-TOC אינה מובטחת כתג ה-<hN>, ולכן
 * מנסים אותה קודם ואחריה את שאר הרמות.
 */
async function readFromHeading(
  bookId: string,
  entry: TocEntry,
): Promise<{ heading: string; level: number; text: string } | null> {
  const levels = [...new Set([entry.level, 1, 2, 3, 4, 5, 6])].filter((l) => l >= 1 && l <= 6);
  for (const level of levels) {
    const heading = `<h${level}>${entry.text}</h${level}>`;
    const text = await callOtzaria<string>('library.getBookContent', {
      bookId,
      section: heading,
      offset: 0,
      limit: MAX_CHUNK,
    });
    if (text?.startsWith(heading)) return { heading, level, text };
  }
  return null;
}

/** מיקום הכותרת הראשונה (ברמת הסימן או מעליה) שמחוץ לטווח, או -1 אם עוד לא הגענו אליה. */
function findRangeEnd(text: string, level: number, inRange: (t: string) => boolean): number {
  for (const m of text.matchAll(/\n<h([1-6])[^>]*>(.*?)<\/h\1>/g)) {
    if (Number(m[1]) > level) continue; // תת-כותרת (למשל "סעיף ו" בביאור הלכה)
    if (inRange(m[2].replace(/<[^>]*>/g, '').trim())) continue;
    return m.index!;
  }
  return -1;
}

export interface LoadedSource {
  ok: boolean;
  text: string;
  error?: string;
}

/**
 * טוען טווח מקור לפי startRef..endRef (כולל סימן הסיום).
 *
 * ה-index של getBookToc הוא מספר שורה, ואילו offset של getBookContent נספר בתווים —
 * ולכן אי אפשר להשתמש בו כ-offset. במקום זאת מעגנים את הקריאה לשורת הכותרת עצמה
 * (section), וקוראים ממנה והלאה עד הכותרת הראשונה שמחוץ לטווח.
 */
export async function loadSourceRange(
  bookName: string,
  startRef: string,
  endRef?: string,
): Promise<LoadedSource> {
  const label = endRef && endRef !== startRef ? `${startRef} – ${endRef}` : startRef;
  try {
    // קודם מפענחים את שם הספר ל-bookId אמיתי (שם התצוגה ≠ bookId)
    const bookId = await resolveBookId(bookName);
    if (!bookId) {
      return { ok: false, text: '', error: `הספר "${bookName}" לא נמצא בספרייה. עדכן את שם הספר בהגדרות.` };
    }
    const range = pickTocRange(await getBookToc(bookId), startRef, endRef);
    if (!range) {
      return { ok: false, text: '', error: `"${label}" לא נמצא בתוכן העניינים של הספר.` };
    }
    const start = await readFromHeading(bookId, range.first);
    if (!start) {
      return { ok: false, text: '', error: `הכותרת "${range.first.text}" לא נמצאה בטקסט הספר.` };
    }

    let text = start.text;
    let lastChunk = text.length;
    let chunks = 1;
    let end = findRangeEnd(text, start.level, range.inRange);
    // chunk קצר מ-MAX_CHUNK = הגענו לסוף הספר
    while (end < 0 && lastChunk === MAX_CHUNK && chunks < MAX_RANGE_CHUNKS) {
      const chunk = await callOtzaria<string>('library.getBookContent', {
        bookId,
        section: start.heading,
        offset: text.length, // אוצריא סופרת offset מתחילת ה-section
        limit: MAX_CHUNK,
      });
      // chunk ריק = הגענו לסוף הספר בדיוק בגבול של MAX_CHUNK; בלי לאפס את
      // lastChunk ההודעה על טווח חתוך הייתה מתווספת לטקסט שנטען במלואו.
      if (!chunk) {
        lastChunk = 0;
        break;
      }
      text += chunk;
      lastChunk = chunk.length;
      chunks++;
      end = findRangeEnd(text, start.level, range.inRange);
    }
    if (end >= 0) return { ok: true, text: text.slice(0, end) };
    if (lastChunk === MAX_CHUNK) {
      text += '\n<p>… הטווח ארוך מדי לתצוגה כאן — להמשך פתח את הספר באוצריא.</p>';
    }
    return { ok: true, text };
  } catch (e) {
    return { ok: false, text: '', error: e instanceof Error ? e.message : 'שגיאה בטעינת המקור' };
  }
}

/** פותח ספר בקורא אוצריא במיקום ה-ref, עם fallback ל-openBook+searchQuery. */
export async function openInOtzaria(bookName: string, ref: string): Promise<boolean> {
  const bookId = (await resolveBookId(bookName)) ?? bookName;
  const ok = await callOtzariaSafe<boolean>('reader.openBookAtRef', { bookId, ref }, false);
  if (ok) return true;
  return await callOtzariaSafe<boolean>('reader.openBook', { bookId, searchQuery: ref }, false);
}
