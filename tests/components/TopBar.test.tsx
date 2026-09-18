import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TopBar } from '../../src/components/TopBar';
import { ToastHost } from '../../src/components/Toast';
import { appStore } from '../../src/state/appStore';
import { getIssues, getWeeksForIssue } from '../../src/data/localData';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import { prepareExams, resetStores, seedAnswer } from '../helpers/app';
import { readZipFromBlob } from '../helpers/zip';

let host: FakeHost;
let downloaded: { name: string; blob: Blob }[];

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
  resetStores();
  downloaded = [];
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
    blobs.push(b as Blob);
    return `blob:${blobs.length}`;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloaded.push({ name: this.download, blob: blobs[blobs.length - 1] });
  });
});

/** פותח את תפריט הייצוא ובוחר פריט בו. */
const clickExport = (label: string) => {
  fireEvent.click(screen.getByTitle('ייצוא ל-Word'));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
};

const renderTopBar = () =>
  render(
    <>
      <ToastHost />
      <TopBar />
    </>,
  );

describe('TopBar — תצוגה', () => {
  it('מציג את שם התוסף ואת הגליון הפעיל', () => {
    renderTopBar();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('עיון ההלכה');
    const exam = getIssues().find((e) => e.issueId === appStore.get().activeIssueId)!;
    expect(screen.getByText(`גליון ${exam.issueNumber} · ${exam.hebrewMonth}`)).toBeInTheDocument();
  });

  it('מציג שלושה כפתורי ניווט, הפעיל מסומן', () => {
    renderTopBar();
    for (const label of ['הספקים', 'שאלות', 'כתיבת תשובות']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'הספקים' })).toHaveClass('active');
  });

  it('לחיצה על כפתור ניווט מחליפה מסך', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: 'שאלות' }));
    expect(appStore.get().screen).toBe('questions');
    fireEvent.click(screen.getByRole('button', { name: 'כתיבת תשובות' }));
    expect(appStore.get().screen).toBe('workspace');
  });

  it('כפתור ההגדרות פותח את חלון ההגדרות', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: 'הגדרות' }));
    expect(appStore.get().settingsOpen).toBe(true);
  });
});

describe('TopBar — בורר גליונות', () => {
  it('פותח רשימה עם כל הגליונות, הפעיל מסומן', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: /גליון/ }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(getIssues().length);
    const active = options.find((o) => o.getAttribute('aria-selected') === 'true')!;
    expect(active).toHaveTextContent(String(getIssues()[0].issueNumber));
  });

  it('בחירת גליון מחליפה גליון וסוגרת את הרשימה', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: /גליון/ }));
    fireEvent.click(screen.getByRole('option', { name: /גליון 240/ }));
    expect(appStore.get().activeIssueId).toBe('issue-0240');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('לחיצה מחוץ לרשימה סוגרת אותה', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: /גליון/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Escape סוגר את הרשימה', () => {
    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: /גליון/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('לחיצה חוזרת על הבורר סוגרת', () => {
    renderTopBar();
    const picker = screen.getByRole('button', { name: /גליון/ });
    fireEvent.click(picker);
    fireEvent.click(picker);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('TopBar — ייצוא ל-Word', () => {
  it('מייצא קובץ DOCX לשבוע הפעיל ומציג הודעה', async () => {
    seedAnswer(appStore.get().activeWeekId!, { answerHtml: '<p>תשובה לייצוא</p>', answerText: 'תשובה לייצוא' });
    renderTopBar();
    clickExport('השבוע הנוכחי');

    await waitFor(() => expect(downloaded).toHaveLength(1));
    expect(downloaded[0].name).toMatch(/^תשובות עיון ההלכה - גליון \d+ - שבוע \d+\.docx$/);
    const doc = (await readZipFromBlob(downloaded[0].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('תשובה לייצוא');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ירד למחשב'));
  });

  it('שומר את התשובות לפני הייצוא', async () => {
    renderTopBar();
    const { updateAnswerContent } = await import('../../src/state/answersStore');
    const { getWeek } = await import('../../src/data/localData');
    updateAnswerContent(getWeek(appStore.get().activeWeekId!)!, '<p>טרם נשמר</p>', 'טרם נשמר');
    clickExport('השבוע הנוכחי');
    await waitFor(() =>
      expect(host.callsTo('storage.set').some((c) => c.payload.key === 'answers:v2')).toBe(true),
    );
  });

  it('ללא שבוע פעיל — מציג הנחיה לבחור שבוע', async () => {
    appStore.set({ activeWeekId: null });
    renderTopBar();
    clickExport('השבוע הנוכחי');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('בחר שבוע לפני ייצוא'));
    expect(downloaded).toHaveLength(0);
  });

  it('שגיאה בייצוא מוצגת כ-toast', async () => {
    const ooxml = await import('../../src/export/ooxml');
    vi.spyOn(ooxml, 'htmlToOoxml').mockImplementation(() => {
      throw new Error('כשל בהמרה');
    });
    renderTopBar();
    clickExport('השבוע הנוכחי');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('שגיאה בייצוא'));
  });

  it('מייצא את כל שבועות הגליון לקובץ אחד', async () => {
    const weeks = getWeeksForIssue(appStore.get().activeIssueId);
    weeks.forEach((w, i) =>
      seedAnswer(w.weekId, { answerHtml: `<p>תשובת שבוע ${i + 1}</p>`, answerText: `תשובת שבוע ${i + 1}` }),
    );
    renderTopBar();
    clickExport('כל השבועות בגליון');

    await waitFor(() => expect(downloaded).toHaveLength(1));
    expect(downloaded[0].name).toMatch(/^תשובות עיון ההלכה - גליון \d+ - כל השבועות\.docx$/);
    const doc = (await readZipFromBlob(downloaded[0].blob)).find((e) => e.name === 'word/document.xml')!;
    weeks.forEach((w, i) => {
      expect(doc.text).toContain(w.parasha);
      expect(doc.text).toContain(`תשובת שבוע ${i + 1}`);
    });
  });

  it('ייצוא כל השבועות אינו תלוי בשבוע פעיל', async () => {
    seedAnswer(getWeeksForIssue(appStore.get().activeIssueId)[0].weekId, {
      answerHtml: '<p>תשובה</p>',
      answerText: 'תשובה',
    });
    appStore.set({ activeWeekId: null });
    renderTopBar();
    clickExport('כל השבועות בגליון');
    await waitFor(() => expect(downloaded).toHaveLength(1));
  });

  it('מדלג על שבועות שלא נענו', async () => {
    const weeks = getWeeksForIssue(appStore.get().activeIssueId);
    seedAnswer(weeks[0].weekId, { answerHtml: '<p>רק ראשון</p>', answerText: 'רק ראשון' });
    renderTopBar();
    clickExport('כל השבועות בגליון');

    await waitFor(() => expect(downloaded).toHaveLength(1));
    const doc = (await readZipFromBlob(downloaded[0].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain(weeks[0].parasha);
    expect(doc.text).not.toContain(weeks[1].parasha);
  });

  it('גליון ללא תשובות כתובות — מציג הנחיה ואינו מוריד קובץ', async () => {
    renderTopBar();
    clickExport('כל השבועות בגליון');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('אין תשובות כתובות בגליון זה'),
    );
    expect(downloaded).toHaveLength(0);
  });

  it('Escape סוגר את תפריט הייצוא', () => {
    renderTopBar();
    fireEvent.click(screen.getByTitle('ייצוא ל-Word'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('בחירה בתפריט סוגרת אותו', async () => {
    renderTopBar();
    clickExport('השבוע הנוכחי');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('TopBar — שליחה במייל', () => {
  it('פותח את דיאלוג השליחה', () => {
    renderTopBar();
    fireEvent.click(screen.getByTitle('שליחה במייל'));
    expect(screen.getByRole('heading', { name: 'שליחת תשובות במייל' })).toBeInTheDocument();
  });

  it('ללא שבוע פעיל — מציג הנחיה ואינו פותח דיאלוג', async () => {
    appStore.set({ activeWeekId: null });
    renderTopBar();
    fireEvent.click(screen.getByTitle('שליחה במייל'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('בחר שבוע לפני שליחה'));
    expect(screen.queryByRole('heading', { name: 'שליחת תשובות במייל' })).not.toBeInTheDocument();
  });

  it('סגירת הדיאלוג מסירה אותו', () => {
    renderTopBar();
    fireEvent.click(screen.getByTitle('שליחה במייל'));
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByRole('heading', { name: 'שליחת תשובות במייל' })).not.toBeInTheDocument();
  });
});
