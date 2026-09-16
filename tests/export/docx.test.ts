import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnswersDocx, downloadBlob, exportIssueDocx, exportWeekDocx } from '../../src/export/docx';
import { answersStore } from '../../src/state/answersStore';
import { readZipFromBlob } from '../helpers/zip';
import { makeSettings, makeWeek } from '../helpers/fixtures';

beforeEach(() => {
  answersStore.set({ answers: { schemaVersion: 2, updatedAt: '', answersByWeek: {} } });
});

describe('buildAnswersDocx', () => {
  it('בונה חבילת DOCX מ-HTML של תשובות', async () => {
    const blob = buildAnswersDocx('<h1>כותרת</h1><p>תשובה</p>');
    const entries = await readZipFromBlob(blob);
    const doc = entries.find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('כותרת');
    expect(doc.text).toContain('תשובה');
    expect(doc.text).toContain('<w:pStyle w:val="Heading1"/>');
  });
});

describe('downloadBlob', () => {
  it('יוצר קישור הורדה, לוחץ עליו ומסיר אותו מה-DOM', () => {
    const clicks: string[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push(this.download);
      });

    downloadBlob(new Blob(['x']), 'קובץ בדיקה.docx');

    expect(clicks).toEqual(['קובץ בדיקה.docx']);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('a')).toHaveLength(0);
    clickSpy.mockRestore();
  });

  it('משחרר את ה-URL לאחר השהייה', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['x']), 'a.docx');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('exportWeekDocx', () => {
  it('מייצר שם קובץ עם מספר גליון ומספר שבוע, ומוריד אותו', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const filename = exportWeekDocx(
      {
        week: makeWeek({ weekNumber: 3, parasha: 'חקת' }),
        settings: makeSettings({ name: 'משה' }),
        issueTitle: 'עיון ההלכה - גליון ר"מ',
        hebrewMonth: 'סיון תשפ"ו',
        dateLabel: '1.1.2026',
      },
      240,
    );

    expect(filename).toBe('תשובות עיון ההלכה - גליון 240 - שבוע 3.docx');
    expect(blobs).toHaveLength(1);
    const doc = (await readZipFromBlob(blobs[0])).find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('משה');
    expect(doc.text).toContain('חקת');
  });

  it('כולל את תשובת השבוע השמורה בקובץ שיוצא', async () => {
    const week = makeWeek();
    answersStore.set((prev) => ({
      answers: {
        ...prev.answers,
        answersByWeek: {
          [week.weekId]: {
            issueId: week.issueId,
            weekId: week.weekId,
            answerHtml: '<p>גופה של התשובה</p>',
            answerText: 'גופה של התשובה',
            status: 'completed',
            wordCount: 3,
            lastSavedAt: '',
          },
        },
      },
    }));
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportWeekDocx(
      {
        week,
        settings: makeSettings(),
        issueTitle: 'גליון',
        hebrewMonth: '',
        dateLabel: '1.1.2026',
      },
      240,
    );
    const doc = (await readZipFromBlob(blobs[0])).find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('גופה של התשובה');
  });
});

describe('exportIssueDocx', () => {
  it('מאחד את כל שבועות הגליון לקובץ אחד עם כותרת אחת', async () => {
    const weeks = [makeWeek({ weekId: 'w1', weekNumber: 1, parasha: 'שלח' }), makeWeek({ weekId: 'w2', weekNumber: 2, parasha: 'קרח' })];
    answersStore.set((prev) => ({
      answers: {
        ...prev.answers,
        answersByWeek: Object.fromEntries(
          weeks.map((w) => [
            w.weekId,
            {
              issueId: w.issueId,
              weekId: w.weekId,
              answerHtml: `<p>תשובה ${w.weekNumber}</p>`,
              answerText: `תשובה ${w.weekNumber}`,
              status: 'completed' as const,
              wordCount: 2,
              lastSavedAt: '',
            },
          ]),
        ),
      },
    }));
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:x';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const filename = exportIssueDocx(
      {
        weeks,
        settings: makeSettings({ name: 'משה' }),
        issueTitle: 'עיון ההלכה - גליון ר"מ',
        hebrewMonth: 'סיון תשפ"ו',
        dateLabel: '1.1.2026',
      },
      240,
    );

    expect(filename).toBe('תשובות עיון ההלכה - גליון 240 - כל השבועות.docx');
    const doc = (await readZipFromBlob(blobs[0])).find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('שלח');
    expect(doc.text).toContain('קרח');
    expect(doc.text).toContain('תשובה 1');
    expect(doc.text).toContain('תשובה 2');
    expect(doc.text?.match(/משה/g)).toHaveLength(1);
  });
});
