// library.ts מחזיק cache פנימי לפי שם ספר — לכן כל טסט טוען את המודול מחדש.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeHost, type FakeHost } from '../helpers/host';
import { installBook, siman, simanimLines } from '../helpers/otzariaBook';
import type { BookMeta, TocEntry } from '../../src/otzaria/otzaria_plugin';

type Library = typeof import('../../src/otzaria/library');

async function freshLibrary(): Promise<Library> {
  vi.resetModules();
  return await import('../../src/otzaria/library');
}

const book = (title: string, bookId = title): BookMeta => ({ title, bookId, topics: [] }) as BookMeta;

const toc: TocEntry[] = [
  { text: 'סימן תקלט', index: 0, level: 1 },
  { text: 'סימן תקמ', index: 1200, level: 1 },
  { text: 'סימן תקמא', index: 2400, level: 1 },
] as TocEntry[];

let host: FakeHost;

beforeEach(() => {
  host = installFakeHost();
});

describe('findBooks', () => {
  it('מעביר query ו-limit, ומחזיר [] בכשל', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    await expect(lib.findBooks('משנה ברורה', 5)).resolves.toHaveLength(1);
    expect(host.callsTo('library.findBooks')[0].payload).toEqual({ query: 'משנה ברורה', limit: 5 });
    host.fail('library.findBooks');
    await expect(lib.findBooks('x')).resolves.toEqual([]);
  });

  it('limit ברירת מחדל 10', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    await lib.findBooks('x');
    expect(host.callsTo('library.findBooks')[0].payload.limit).toBe(10);
  });
});

describe('resolveBookId — בחירת הספר הנכון', () => {
  it('התאמה מדויקת אחרי נרמול פיסוק (פסיק/גרשיים)', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('שולחן ערוך אורח חיים'), book('שולחן ערוך, אורח חיים')]);
    await expect(lib.resolveBookId('שולחן ערוך, אורח חיים')).resolves.toBe('שולחן ערוך אורח חיים');
  });

  it('מעדיף ספר בסיס על מפרש ("X על Y")', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('מטה יהונתן על שולחן ערוך'), book('שולחן ערוך השלם')]);
    await expect(lib.resolveBookId('שולחן ערוך')).resolves.toBe('שולחן ערוך השלם');
  });

  it('מתיר מפרש כשהשם המבוקש עצמו הוא של מפרש', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('ביאור הלכה על אורח חיים')]);
    await expect(lib.resolveBookId('ביאור הלכה על אורח חיים')).resolves.toBe('ביאור הלכה על אורח חיים');
  });

  it('מתאים לפי תחילת שם כשאין התאמה מדויקת', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה חלק א')]);
    await expect(lib.resolveBookId('משנה ברורה')).resolves.toBe('משנה ברורה חלק א');
  });

  it('נופל לתוצאה הראשונה כשאין התאמה טובה', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('פירוש א על ב'), book('פירוש ג על ד')]);
    await expect(lib.resolveBookId('משהו אחר על ב')).resolves.toBe('פירוש א על ב');
  });

  it('מחזיר null לשם ריק וללא תוצאות', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    await expect(lib.resolveBookId('')).resolves.toBeNull();
    await expect(lib.resolveBookId('לא קיים')).resolves.toBeNull();
  });

  it('שומר תוצאה ב-cache ואינו קורא שוב (גם לתוצאה null)', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    await lib.resolveBookId('משנה ברורה');
    await lib.resolveBookId('משנה ברורה');
    expect(host.callsTo('library.findBooks')).toHaveLength(1);

    host.on('library.findBooks', () => []);
    await lib.resolveBookId('חסר');
    await lib.resolveBookId('חסר');
    expect(host.callsTo('library.findBooks')).toHaveLength(2);
  });
});

describe('autoDetectBookId', () => {
  it('מחזיר התאמה מדויקת', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('אחר'), book('משנה ברורה')]);
    await expect(lib.autoDetectBookId('משנה ברורה')).resolves.toBe('משנה ברורה');
  });

  it('מחזיר התאמה יחידה לפי תחילת שם, ללא מפרשים', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה חלק ב'), book('משנה ברורה על שו"ע')]);
    await expect(lib.autoDetectBookId('משנה ברורה')).resolves.toBe('משנה ברורה חלק ב');
  });

  it('מחזיר null כשיש כמה מועמדים מתחילים באותו שם', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה א'), book('משנה ברורה ב'), book('ספר אחר')]);
    await expect(lib.autoDetectBookId('משנה ברורה')).resolves.toBeNull();
  });

  it('מחזיר את התוצאה היחידה גם כשאינה מתחילה בשם', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('שו"ע אורח חיים')]);
    await expect(lib.autoDetectBookId('שולחן ערוך, אורח חיים')).resolves.toBe('שו"ע אורח חיים');
  });

  it('מחזיר null כשאין תוצאות', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    await expect(lib.autoDetectBookId('כלום')).resolves.toBeNull();
  });
});

describe('findBestTocEntry', () => {
  it('התאמה מדויקת', async () => {
    const lib = await freshLibrary();
    expect(lib.findBestTocEntry(toc, 'סימן תקמ')?.index).toBe(1200);
  });

  it('מתעלם מגרשיים/גרשים בהשוואה', async () => {
    const lib = await freshLibrary();
    const entries = [{ text: 'סימן תקמ"א', index: 500, level: 1 }] as TocEntry[];
    expect(lib.findBestTocEntry(entries, 'סימן תקמא')?.index).toBe(500);
  });

  it('בוחר את ההתאמה החלקית הארוכה ביותר', async () => {
    const lib = await freshLibrary();
    const entries = [
      { text: 'סימן', index: 10, level: 1 },
      { text: 'סימן תקמא סעיף ב', index: 20, level: 2 },
    ] as TocEntry[];
    expect(lib.findBestTocEntry(entries, 'סימן תקמא סעיף ב סוף')?.index).toBe(20);
  });

  it('מחזיר null ל-toc ריק או ref ריק', async () => {
    const lib = await freshLibrary();
    expect(lib.findBestTocEntry([], 'סימן א')).toBeNull();
    expect(lib.findBestTocEntry(toc, '')).toBeNull();
  });

  it('מחזיר null כשאין שום התאמה', async () => {
    const lib = await freshLibrary();
    expect(lib.findBestTocEntry(toc, 'הלכות שבת')).toBeNull();
  });
});

describe('simanNumber', () => {
  it('מפענח גימטריה, עם או בלי גרשיים, וכולל אותיות סופיות', async () => {
    const lib = await freshLibrary();
    expect(lib.simanNumber('סימן תקפא')).toBe(581);
    expect(lib.simanNumber('סימן תקפ״א')).toBe(581);
    expect(lib.simanNumber('סימן  תרך')).toBe(620);
    expect(lib.simanNumber('סימן טו')).toBe(15);
  });

  it('מחזיר null לכותרת שאינה סימן', async () => {
    const lib = await freshLibrary();
    expect(lib.simanNumber('הקדמה')).toBeNull();
    expect(lib.simanNumber('סעיף א')).toBeNull();
    expect(lib.simanNumber('סימן א1')).toBeNull();
  });
});

describe('loadSourceRange — לפי כותרת הסימן, כמו באוצריא', () => {
  async function load(lines: string[], startRef: string, endRef?: string) {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    installBook(host, lines);
    return lib.loadSourceRange('משנה ברורה', startRef, endRef);
  }

  it('טוען בדיוק את טווח הסימנים ולא את תחילת הספר (index ב-TOC הוא מספר שורה)', async () => {
    const res = await load(simanimLines([1, 2, 3, 4, 5, 6]), siman(3), siman(4));
    expect(res.ok).toBe(true);
    expect(res.text).toBe(
      [`<h2>${siman(3)}</h2>`, `<b>דיבור המתחיל</b> תוכן ${siman(3)}`,
        `<h2>${siman(4)}</h2>`, `<b>דיבור המתחיל</b> תוכן ${siman(4)}`].join('\n'),
    );
    const calls = host.callsTo('library.getBookContent');
    expect(calls.every((c) => c.payload.section === `<h2>${siman(3)}</h2>`)).toBe(true);
  });

  it('ref יחיד — עד הסימן הבא', async () => {
    const res = await load(simanimLines([1, 2, 3]), siman(2));
    expect(res.text).toBe(`<h2>${siman(2)}</h2>\n<b>דיבור המתחיל</b> תוכן ${siman(2)}`);
  });

  it('תת-כותרות בתוך הסימן (סעיף) אינן עוצרות את הטעינה', async () => {
    const lines = simanimLines([1, 2, 3], (n) => ['<h3>סעיף א</h3>', `א${n}`, '<h3>סעיף ב</h3>', `ב${n}`]);
    const res = await load(lines, siman(2));
    expect(res.text).toContain('ב2');
    expect(res.text).not.toContain(siman(3));
  });

  it('סימן ההתחלה חסר בספר (כמו בביאור הלכה) — מתחיל מהסימן הקיים הראשון בטווח', async () => {
    const res = await load(simanimLines([1, 3, 5]), siman(2), siman(4));
    expect(res.text).toBe(`<h2>${siman(3)}</h2>\n<b>דיבור המתחיל</b> תוכן ${siman(3)}`);
  });

  it('אין אף סימן בטווח — שגיאה, ולא תוכן אחר', async () => {
    const res = await load(simanimLines([1, 5]), siman(2), siman(4));
    expect(res).toEqual({
      ok: false,
      text: '',
      error: `"${siman(2)} – ${siman(4)}" לא נמצא בתוכן העניינים של הספר.`,
    });
  });

  it('טווח ארוך נטען בכמה קריאות של עד 5000 תווים ונחתך בדיוק לפני הסימן הבא', async () => {
    const body = () => ['x'.repeat(3000), 'y'.repeat(3000)];
    const res = await load(simanimLines([1, 2, 3, 4, 5], body), siman(2), siman(4));
    const calls = host.callsTo('library.getBookContent');
    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((c) => Number(c.payload.limit) <= 5000)).toBe(true);
    expect(res.text).toBe(
      [2, 3, 4].flatMap((n) => [`<h2>${siman(n)}</h2>`, ...body()]).join('\n'),
    );
  });

  it('טווח ארוך מהתקרה — נחתך עם הפניה לאוצריא', async () => {
    const numbers = Array.from({ length: 80 }, (_, i) => i + 1);
    const res = await load(simanimLines(numbers, () => ['z'.repeat(4000)]), siman(1), siman(80));
    expect(host.callsTo('library.getBookContent')).toHaveLength(40);
    expect(res.ok).toBe(true);
    expect(res.text).toContain('פתח את הספר באוצריא');
  });

  it('עוצר בסוף הספר', async () => {
    const res = await load(simanimLines([1, 2]), siman(2), siman(9));
    expect(res.text).toBe(`<h2>${siman(2)}</h2>\n<b>דיבור המתחיל</b> תוכן ${siman(2)}`);
    expect(host.callsTo('library.getBookContent')).toHaveLength(1);
  });

  it('סוף הספר בדיוק בגבול chunk — נטען במלואו, בלי הודעת החיתוך', async () => {
    const heading = `<h2>${siman(2)}</h2>`;
    // מהכותרת ועד סוף הספר: בדיוק 2 chunks, כך שהקריאה השלישית חוזרת ריקה
    const tail = 'x'.repeat(2 * 5000 - heading.length - 1);
    const res = await load(['<h1>ספר</h1>', `<h2>${siman(1)}</h2>`, 'פתיחה', heading, tail], siman(2));
    expect(host.callsTo('library.getBookContent')).toHaveLength(3);
    expect(res.text).toBe(`${heading}\n${tail}`);
    expect(res.text).not.toContain('פתח את הספר באוצריא');
  });

  it('כותרת שה-TOC מכיר אך אינה בטקסט בצורה <hN>…</hN> — שגיאה, ולא תחילת הספר', async () => {
    const lines = simanimLines([1, 2]).map((l) =>
      l === `<h2>${siman(2)}</h2>` ? `<h2><b>${siman(2)}</b></h2>` : l,
    );
    const res = await load(lines, siman(2));
    expect(res).toEqual({ ok: false, text: '', error: `הכותרת "${siman(2)}" לא נמצאה בטקסט הספר.` });
  });

  it('כותרת עם גרשיים בספר מתאימה ל-ref בלי גרשיים', async () => {
    const lines = ['<h1>ספר</h1>', '<h2>סימן ק</h2>', 'א', '<h2>סימן ק״א</h2>', 'ב', '<h2>סימן קב</h2>', 'ג'];
    const res = await load(lines, 'סימן קא');
    expect(res.text).toBe('<h2>סימן ק״א</h2>\nב');
  });

  it('ref שאינו "סימן X" — לפי שם הכותרת המדויק', async () => {
    const res = await load(simanimLines([1]), 'הקדמה');
    expect(res.text.startsWith('<h2>הקדמה</h2>')).toBe(true);
    expect(res.text).not.toContain(siman(1));
  });

  it('ספר ללא תוכן עניינים — שגיאה', async () => {
    const res = await load(['שורה', 'עוד שורה'], siman(1));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('תוכן העניינים');
  });

  it('מחזיר שגיאה מודרכת כשהספר לא נמצא', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    const res = await lib.loadSourceRange('ספר דמיוני', 'סימן א');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('לא נמצא בספרייה');
    expect(res.error).toContain('הגדרות');
  });

  it('לוכד חריגות ומחזיר את הודעת השגיאה', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    installBook(host, simanimLines([1]));
    host.throws('library.getBookContent', new Error('נפילת bridge'));
    const res = await lib.loadSourceRange('משנה ברורה', siman(1));
    expect(res).toEqual({ ok: false, text: '', error: 'נפילת bridge' });
  });
});

describe('openInOtzaria', () => {
  it('פותח דרך reader.openBookAtRef', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('reader.openBookAtRef', () => true);
    await expect(lib.openInOtzaria('משנה ברורה', 'סימן תקלט')).resolves.toBe(true);
    expect(host.callsTo('reader.openBookAtRef')[0].payload).toEqual({
      bookId: 'משנה ברורה',
      ref: 'סימן תקלט',
    });
    expect(host.callsTo('reader.openBook')).toHaveLength(0);
  });

  it('נופל ל-reader.openBook עם searchQuery', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.fail('reader.openBookAtRef');
    host.on('reader.openBook', () => true);
    await expect(lib.openInOtzaria('משנה ברורה', 'סימן תקלט')).resolves.toBe(true);
    expect(host.callsTo('reader.openBook')[0].payload).toEqual({
      bookId: 'משנה ברורה',
      searchQuery: 'סימן תקלט',
    });
  });

  it('משתמש בשם שהתקבל כשה-bookId לא נפתר', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    host.on('reader.openBookAtRef', () => true);
    await lib.openInOtzaria('שם גולמי', 'סימן א');
    expect(host.callsTo('reader.openBookAtRef')[0].payload.bookId).toBe('שם גולמי');
  });

  it('מחזיר false כששני המסלולים נכשלו', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.fail('reader.openBookAtRef');
    host.fail('reader.openBook');
    await expect(lib.openInOtzaria('משנה ברורה', 'סימן א')).resolves.toBe(false);
  });
});

describe('getBookToc', () => {
  it('מחזיר את ה-TOC, ו-[] בכשל', async () => {
    const lib = await freshLibrary();
    host.on('library.getBookToc', () => toc);
    await expect(lib.getBookToc('b')).resolves.toHaveLength(3);
    host.fail('library.getBookToc');
    await expect(lib.getBookToc('b')).resolves.toEqual([]);
  });
});
