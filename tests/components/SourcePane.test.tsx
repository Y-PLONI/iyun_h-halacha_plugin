import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SourcePane } from '../../src/components/SourcePane';
import { appStore } from '../../src/state/appStore';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import { resetStores } from '../helpers/app';
import { makeWeek } from '../helpers/fixtures';
import { installBook, siman, simanimLines } from '../helpers/otzariaBook';

let host: FakeHost;

/** ה-SourcePane מחזיק cache בזיכרון לפי bookId:ref — מגוונים refs בין טסטים. */
let refCounter = 0;
function weekWithSources(): ReturnType<typeof makeWeek> {
  refCounter++;
  return makeWeek({
    sourceRefs: {
      shulchanAruch: { startRef: siman(refCounter), endRef: siman(refCounter + 1) },
      mishnaBerurah: { startRef: siman(refCounter) },
      biurHalacha: { startRef: siman(refCounter) },
    },
  });
}

/** ספר בפורמט אוצריא עם סימנים א..קכ, שבכל אחד השורות שב-body. */
const allSimanim = Array.from({ length: 120 }, (_, i) => i + 1);
const bookWith = (body: string[]) => simanimLines(allSimanim, () => body);

beforeEach(() => {
  host = installFakeHost({
    ...defaultHandlers(),
    'library.findBooks': (p) => [{ title: String(p.query), bookId: String(p.query), topics: [] }],
  });
  installBook(host, bookWith(['<h3>סעיף א</h3>', '<b>ד"ה</b> תוכן המקור']));
  resetStores();
});

describe('SourcePane — חלוניות מקורות', () => {
  it('מרנדר חלונית לכל תפקיד עם ref (שו"ע, מ"ב, ביאור הלכה)', async () => {
    render(<SourcePane week={weekWithSources()} />);
    expect(screen.getByText(/שולחן ערוך ·/)).toBeInTheDocument();
    expect(screen.getByText(/משנה ברורה ·/)).toBeInTheDocument();
    expect(screen.getByText(/ביאור הלכה ·/)).toBeInTheDocument();
  });

  it('כותרת החלונית מציגה טווח כשיש endRef שונה', () => {
    render(<SourcePane week={weekWithSources()} />);
    expect(screen.getByText(/שולחן ערוך · סימן \S+ – סימן \S+/)).toBeInTheDocument();
  });

  it('שער הציון אינו מוצג (הספר אינו במאגר)', () => {
    const week = weekWithSources();
    week.sourceRefs.shaarHatziyun = { startRef: 'סימן א' };
    render(<SourcePane week={week} />);
    expect(screen.queryByText(/שער הציון/)).not.toBeInTheDocument();
  });

  it('שבוע ללא מקורות מציג הודעה', () => {
    render(<SourcePane week={makeWeek({ sourceRefs: {} })} />);
    expect(screen.getByText('אין מקורות מוגדרים לשבוע זה.')).toBeInTheDocument();
  });

  it('טוען את תוכן המקור ומציג אותו לאחר ניקוי', async () => {
    const { container } = render(<SourcePane week={weekWithSources()} />);
    await waitFor(() => expect(container.querySelectorAll('.source-html').length).toBeGreaterThan(0));
    const html = container.querySelector('.source-html')!.innerHTML;
    expect(html).toContain('<h3>סעיף א</h3>');
    expect(html).toContain('תוכן המקור');
  });

  it('מסיר סקריפטים מתוכן שהתקבל מאוצריא', async () => {
    installBook(host, bookWith(['<script>alert(1)</script><p>נקי</p>']));
    const { container } = render(<SourcePane week={weekWithSources()} />);
    await waitFor(() => expect(container.querySelector('.source-html')).toBeTruthy());
    expect(container.querySelector('.source-html')!.innerHTML).not.toContain('<script');
    expect(container.querySelector('.source-html')!.innerHTML).toContain('נקי');
  });

  it('מציג הודעת טעינה בזמן שליפה', () => {
    render(<SourcePane week={weekWithSources()} />);
    expect(screen.getAllByText('טוען מקור…').length).toBeGreaterThan(0);
  });
});

/** ספר שאינו קיים בספרייה. שם ייחודי לכל קריאה, כי library.ts שומר cache לפי שם. */
function withMissingBook(): void {
  refCounter++;
  const missing = `ספר שאינו קיים ${refCounter}`;
  resetStores({
    bookIds: {
      shulchanAruch: missing,
      mishnaBerurah: missing,
      biurHalacha: missing,
      shaarHatziyun: missing,
    },
  });
  host.on('library.findBooks', (p) => (String(p.query) === missing ? [] : [{ title: String(p.query), bookId: String(p.query), topics: [] }]));
}

describe('SourcePane — שגיאות והגדרות', () => {
  it('מציג שגיאה וכפתור "הגדר ספר" כשהספר לא נמצא', async () => {
    withMissingBook();
    render(<SourcePane week={weekWithSources()} />);
    await waitFor(() => expect(screen.getAllByText(/לא נמצא בספרייה/).length).toBeGreaterThan(0));
    expect(screen.getAllByRole('button', { name: 'הגדר ספר' }).length).toBeGreaterThan(0);
  });

  it('לחיצה על "הגדר ספר" פותחת את חלון ההגדרות', async () => {
    withMissingBook();
    render(<SourcePane week={weekWithSources()} />);
    const buttons = await waitFor(() => screen.getAllByRole('button', { name: 'הגדר ספר' }));
    buttons[0].click();
    expect(appStore.get().settingsOpen).toBe(true);
  });

  it('ללא שם ספר מוגדר — מציג הנחיה להגדיר', async () => {
    resetStores({
      bookIds: {
        shulchanAruch: '',
        mishnaBerurah: '',
        biurHalacha: '',
        shaarHatziyun: '',
      },
    });
    render(<SourcePane week={makeWeek({ sourceRefs: { mishnaBerurah: { startRef: 'סימן א' } } })} />);
    await waitFor(() =>
      expect(screen.getByText('לא הוגדר ספר. הגדר את שם הספר בהגדרות.')).toBeInTheDocument(),
    );
  });

  it('נופל ל-bookId מתוך ה-ref כשאין הגדרה', async () => {
    resetStores({
      bookIds: { shulchanAruch: '', mishnaBerurah: '', biurHalacha: '', shaarHatziyun: '' },
    });
    render(
      <SourcePane
        week={makeWeek({
          sourceRefs: { mishnaBerurah: { bookId: 'מ"ב מהנתונים', startRef: 'סימן ק' } },
        })}
      />,
    );
    await waitFor(() =>
      expect(host.callsTo('library.findBooks').some((c) => c.payload.query === 'מ"ב מהנתונים')).toBe(true),
    );
  });
});

describe('SourcePane — פעולות בכותרת', () => {
  it('כפתור "פתח באוצריא" פותח את הספר ב-ref', async () => {
    render(<SourcePane week={weekWithSources()} />);
    screen.getAllByTitle('פתח באוצריא')[0].click();
    await waitFor(() => expect(host.callsTo('reader.openBookAtRef')).toHaveLength(1));
    expect(host.callsTo('reader.openBookAtRef')[0].payload.bookId).toBe('שולחן ערוך, אורח חיים');
  });

  it('כשל בפתיחה מציג toast', async () => {
    host.fail('reader.openBookAtRef');
    host.fail('reader.openBook');
    const { ToastHost } = await import('../../src/components/Toast');
    render(
      <>
        <ToastHost />
        <SourcePane week={weekWithSources()} />
      </>,
    );
    screen.getAllByTitle('פתח באוצריא')[0].click();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('לא ניתן לפתוח את הספר באוצריא'),
    );
  });

  it('כפתור רענון טוען מחדש את המקור', async () => {
    const week = weekWithSources();
    const { container } = render(<SourcePane week={week} />);
    await waitFor(() => expect(container.querySelector('.source-html')).toBeTruthy());
    const before = host.callsTo('library.getBookContent').length;
    installBook(host, bookWith(['<p>תוכן מרוענן</p>']));
    screen.getAllByTitle('רענן')[0].click();
    await waitFor(() => expect(host.callsTo('library.getBookContent').length).toBeGreaterThan(before));
    await waitFor(() =>
      expect(container.querySelector('.source-html')!.innerHTML).toContain('תוכן מרוענן'),
    );
  });

  it('ללא ספר מוגדר — "פתח באוצריא" פותח את ההגדרות', async () => {
    resetStores({
      bookIds: { shulchanAruch: '', mishnaBerurah: '', biurHalacha: '', shaarHatziyun: '' },
    });
    render(<SourcePane week={makeWeek({ sourceRefs: { mishnaBerurah: { startRef: 'סימן א' } } })} />);
    screen.getAllByTitle('פתח באוצריא')[0].click();
    await waitFor(() => expect(appStore.get().settingsOpen).toBe(true));
    expect(host.callsTo('reader.openBookAtRef')).toHaveLength(0);
  });
});

describe('SourcePane — cache', () => {
  it('מקור זהה נטען פעם אחת בלבד', async () => {
    const week = weekWithSources();
    const first = render(<SourcePane week={week} />);
    await waitFor(() => expect(first.container.querySelector('.source-html')).toBeTruthy());
    const calls = host.callsTo('library.getBookContent').length;
    first.unmount();
    const second = render(<SourcePane week={week} />);
    await waitFor(() => expect(second.container.querySelector('.source-html')).toBeTruthy());
    expect(host.callsTo('library.getBookContent').length).toBe(calls);
  });

  it('שינוי ref גורם לטעינה מחדש', async () => {
    const { container, rerender } = render(<SourcePane week={weekWithSources()} />);
    await waitFor(() => expect(container.querySelector('.source-html')).toBeTruthy());
    const calls = host.callsTo('library.getBookContent').length;
    rerender(<SourcePane week={weekWithSources()} />);
    await waitFor(() => expect(host.callsTo('library.getBookContent').length).toBeGreaterThan(calls));
  });
});

describe('SourcePane — layout', () => {
  it('משתמש ב-SplitPane אנכי עם מפתח sources-v1', async () => {
    const { container } = render(<SourcePane week={weekWithSources()} />);
    expect((container.firstElementChild as HTMLElement).style.flexDirection).toBe('column');
    await waitFor(() =>
      expect(host.callsTo('storage.get').some((c) => c.payload.key === 'split-sizes:v2')).toBe(true),
    );
  });

  it('חלוניות המקורות ניתנות לכיווץ', () => {
    render(<SourcePane week={weekWithSources()} />);
    expect(screen.getAllByTitle('כווץ')).toHaveLength(3);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
