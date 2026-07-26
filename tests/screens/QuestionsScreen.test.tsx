import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionsScreen } from '../../src/screens/QuestionsScreen';
import { ToastHost } from '../../src/components/Toast';
import { appStore } from '../../src/state/appStore';
import { getWeeksForIssue } from '../../src/data/localData';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import { prepareExams, resetStores } from '../helpers/app';

let host: FakeHost;

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  host = installFakeHost({
    ...defaultHandlers(),
    'library.findBooks': (p) => [{ title: String(p.query), bookId: String(p.query), topics: [] }],
  });
  resetStores();
  appStore.set({ activeIssueId: 'issue-0240', activeWeekId: 'issue-0240-w1', screen: 'questions' });
});

const renderScreen = () =>
  render(
    <>
      <ToastHost />
      <QuestionsScreen />
    </>,
  );

describe('QuestionsScreen', () => {
  it('מציג בורר שבועות עם כל שבועות הגליון', () => {
    renderScreen();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options).toHaveLength(getWeeksForIssue('issue-0240').length);
    expect(select.value).toBe('issue-0240-w1');
    expect(select.options[0].textContent).toContain('שבוע 1 · פרשת שלח לך');
  });

  it('בחירת שבוע אחר מעדכנת את המצב ואת המבחן המוצג', () => {
    const { container } = renderScreen();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'issue-0240-w3' } });
    expect(appStore.get().activeWeekId).toBe('issue-0240-w3');
    expect(container.querySelector('.exam-doc-head')).toHaveTextContent('שבוע 3/4');
  });

  it('מציג את מסמך המבחן של השבוע', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.exam-card')).toBeInTheDocument();
    expect(container.querySelectorAll('.exam-q').length).toBeGreaterThan(0);
  });

  it('כפתור "עבור לכתיבה" פותח את סביבת הכתיבה על השבוע', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'עבור לכתיבה' }));
    expect(appStore.get()).toMatchObject({ screen: 'workspace', activeWeekId: 'issue-0240-w1' });
  });

  it('כפתור "פתח מקור באוצריא" פותח את משנה ברורה ב-ref של השבוע', async () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /פתח מקור באוצריא/ }));
    await waitFor(() => expect(host.callsTo('reader.openBookAtRef')).toHaveLength(1));
    const payload = host.callsTo('reader.openBookAtRef')[0].payload;
    expect(payload.bookId).toBe('משנה ברורה');
    expect(payload.ref).toBe(getWeeksForIssue('issue-0240')[0].sourceRefs.mishnaBerurah!.startRef);
  });

  it('כשל בפתיחה מציג toast', async () => {
    host.fail('reader.openBookAtRef');
    host.fail('reader.openBook');
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /פתח מקור באוצריא/ }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('לא ניתן לפתוח את הספר באוצריא'),
    );
  });

  it('ללא שם ספר מוגדר — מציג הודעה ואינו פותח', async () => {
    resetStores({
      bookIds: { shulchanAruch: '', mishnaBerurah: '', biurHalacha: '', shaarHatziyun: '' },
    });
    appStore.set({ activeIssueId: 'issue-0240', activeWeekId: 'issue-0240-w1' });
    const { getWeek } = await import('../../src/data/localData');
    const week = getWeek('issue-0240-w1')!;
    const original = week.sourceRefs.mishnaBerurah;
    week.sourceRefs.mishnaBerurah = { startRef: original!.startRef }; // ללא bookId
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /פתח מקור באוצריא/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('לא הוגדר ספר משנה ברורה'));
    expect(host.callsTo('reader.openBookAtRef')).toHaveLength(0);
    week.sourceRefs.mishnaBerurah = original;
  });

  it('ללא שבוע פעיל — מציג הנחיה לבחור שבוע ואין כפתורי פעולה', () => {
    appStore.set({ activeWeekId: null });
    renderScreen();
    expect(screen.getByText('בחר שבוע להצגת המבחן')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'עבור לכתיבה' })).not.toBeInTheDocument();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
