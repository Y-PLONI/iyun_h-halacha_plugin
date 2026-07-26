// library.ts מחזיק cache פנימי לפי שם ספר — לכן כל טסט טוען את המודול מחדש.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeHost, type FakeHost } from '../helpers/host';
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

describe('loadSourceRange', () => {
  it('טוען טווח לפי ה-TOC ומחזיר את הטקסט', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => toc);
    host.on('library.getBookContent', () => 'תוכן הסימן');
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן תקלט', 'סימן תקמ');
    expect(res).toEqual({ ok: true, text: 'תוכן הסימן' });
    const call = host.callsTo('library.getBookContent')[0];
    expect(call.payload.bookId).toBe('משנה ברורה');
    expect(call.payload.offset).toBe(0);
  });

  it('מגביל כל קריאה ל-5000 תווים ומחבר מספר קריאות', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => [
      { text: 'סימן א', index: 0, level: 1 },
      { text: 'סימן ב', index: 12000, level: 1 },
    ]);
    host.on('library.getBookContent', (p) => 'x'.repeat(Number(p.limit)));
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן א', 'סימן ב');
    const calls = host.callsTo('library.getBookContent');
    expect(calls.every((c) => Number(c.payload.limit) <= 5000)).toBe(true);
    expect(calls.length).toBeGreaterThan(1);
    expect(res.text.length).toBe(14000); // 12000 + 2000 מרווח
  });

  it('עוצר כשמגיע לסוף הספר (chunk קצר מהמבוקש)', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => [
      { text: 'סימן א', index: 0, level: 1 },
      { text: 'סימן ב', index: 12000, level: 1 },
    ]);
    host.on('library.getBookContent', () => 'סוף');
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן א', 'סימן ב');
    expect(res.text).toBe('סוף');
    expect(host.callsTo('library.getBookContent')).toHaveLength(1);
  });

  it('נופל לחיפוש לפי section כשה-TOC אינו מכיל את ה-ref', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => []);
    host.on('library.getBookContent', (p) => (p.section ? 'תוכן לפי section' : ''));
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן תקלט');
    expect(res).toEqual({ ok: true, text: 'תוכן לפי section' });
    expect(host.callsTo('library.getBookContent')[0].payload.section).toBe('סימן תקלט');
  });

  it('נופל לתחילת הספר כשגם section ריק', async () => {
    const lib = await freshLibrary();
    let sectionTried = false;
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => []);
    host.on('library.getBookContent', (p) => {
      if (p.section) {
        sectionTried = true;
        return '';
      }
      return 'תחילת הספר';
    });
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן תקלט');
    expect(sectionTried).toBe(true);
    expect(res).toEqual({ ok: true, text: 'תחילת הספר' });
  });

  it('מחזיר שגיאה מודרכת כשהספר לא נמצא', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => []);
    const res = await lib.loadSourceRange('ספר דמיוני', 'סימן א');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('לא נמצא בספרייה');
    expect(res.error).toContain('הגדרות');
  });

  it('מחזיר שגיאה כשאין תוכן בכלל', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => []);
    host.on('library.getBookContent', () => '');
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן תקלט');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('לא נמצא תוכן');
  });

  it('לוכד חריגות ומחזיר את הודעת השגיאה', async () => {
    const lib = await freshLibrary();
    host.on('library.findBooks', () => [book('משנה ברורה')]);
    host.on('library.getBookToc', () => toc);
    host.throws('library.getBookContent', new Error('נפילת bridge'));
    const res = await lib.loadSourceRange('משנה ברורה', 'סימן תקלט');
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
