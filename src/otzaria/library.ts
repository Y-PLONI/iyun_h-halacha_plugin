// טעינת מקורות מאוצריא: איתור ספרים, טעינת תוכן לפי ref, פתיחה בקורא.

import { callOtzaria, callOtzariaSafe } from './sdk';
import type { BookMeta, TocEntry } from './otzaria_plugin';

const MAX_CHUNK = 5000; // library.getBookContent מוגבל ל-5000 תווים לקריאה

export async function findBooks(query: string, limit = 10): Promise<BookMeta[]> {
  return await callOtzariaSafe<BookMeta[]>('library.findBooks', { query, limit }, []);
}

/**
 * מנסה לזהות אוטומטית bookId לפי שם מבוקש.
 * מחזיר את ה-bookId אם יש התאמה מדויקת או התאמה יחידה, אחרת null.
 */
export async function autoDetectBookId(wantedName: string): Promise<string | null> {
  const books = await findBooks(wantedName, 10);
  if (books.length === 0) return null;
  const exact = books.find((b) => b.title === wantedName || b.bookId === wantedName);
  if (exact) return exact.bookId;
  // התאמה שמתחילה בשם המבוקש (למשל "שולחן ערוך אורח חיים")
  const starts = books.filter((b) => b.title.startsWith(wantedName));
  if (starts.length === 1) return starts[0].bookId;
  if (books.length === 1) return books[0].bookId;
  return null;
}

export async function getBookToc(bookId: string): Promise<TocEntry[]> {
  return await callOtzariaSafe<TocEntry[]>('library.getBookToc', { bookId }, []);
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
  bookId: string,
  startRef: string,
  endRef?: string,
): Promise<LoadedSource> {
  try {
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
    return { ok: false, text: '', error: 'לא נמצא תוכן עבור ההתייחסות המבוקשת' };
  } catch (e) {
    return { ok: false, text: '', error: e instanceof Error ? e.message : 'שגיאה בטעינת המקור' };
  }
}

/** פותח ספר בקורא אוצריא במיקום ה-ref, עם fallback ל-openBook+searchQuery. */
export async function openInOtzaria(bookId: string, ref: string): Promise<boolean> {
  const ok = await callOtzariaSafe<boolean>('reader.openBookAtRef', { bookId, ref }, false);
  if (ok) return true;
  return await callOtzariaSafe<boolean>('reader.openBook', { bookId, searchQuery: ref }, false);
}
