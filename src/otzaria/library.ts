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

async function loadContentChunks(bookId: string, offset: number, totalLimit: number): Promise<string> {
  let out = '';
  let pos = offset;
  let remaining = Math.max(1, totalLimit);
  let guard = 0;
  while (remaining > 0 && guard < 12) {
    const limit = Math.min(MAX_CHUNK, remaining);
    const chunk = await callOtzaria<string>('library.getBookContent', {
      bookId,
      offset: pos,
      limit,
    });
    if (!chunk) break;
    out += chunk;
    if (chunk.length < limit) break; // הגענו לסוף הספר
    pos += chunk.length;
    remaining -= chunk.length;
    guard++;
  }
  return out;
}

export interface LoadedSource {
  ok: boolean;
  text: string;
  error?: string;
}

/**
 * טוען טווח מקור לפי startRef..endRef. מאתר offset לפי ה-TOC,
 * ומעריך אורך קריאה. אם ה-TOC לא מכיל את ה-ref — fallback ל-section.
 */
export async function loadSourceRange(
  bookName: string,
  startRef: string,
  endRef?: string,
): Promise<LoadedSource> {
  try {
    // קודם מפענחים את שם הספר ל-bookId אמיתי (שם התצוגה ≠ bookId)
    const bookId = await resolveBookId(bookName);
    if (!bookId) {
      return { ok: false, text: '', error: `הספר "${bookName}" לא נמצא בספרייה. עדכן את שם הספר בהגדרות.` };
    }
    const toc = await getBookToc(bookId);
    const start = findBestTocEntry(toc, startRef);
    const end = endRef ? findBestTocEntry(toc, endRef) : null;
    if (start) {
      const offset = Math.max(0, start.index);
      const estimated = end && end.index > offset
        ? Math.min(4 * MAX_CHUNK, end.index - offset + 2000)
        : MAX_CHUNK;
      const text = await loadContentChunks(bookId, offset, estimated);
      if (text.trim()) return { ok: true, text };
    }
    // fallback: קפיצה לקטע לפי section
    const sectionText = await callOtzariaSafe<string>(
      'library.getBookContent',
      { bookId, section: startRef, limit: MAX_CHUNK },
      '',
    );
    if (sectionText.trim()) return { ok: true, text: sectionText };
    // fallback אחרון: תחילת הספר
    const head = await loadContentChunks(bookId, 0, MAX_CHUNK);
    if (head.trim()) return { ok: true, text: head };
    return { ok: false, text: '', error: `לא נמצא תוכן עבור "${startRef}" בספר.` };
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
