import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceScreen } from '../../src/screens/WorkspaceScreen';
import { appStore } from '../../src/state/appStore';
import { defaultHandlers, installFakeHost } from '../helpers/host';
import { prepareExams, resetStores, seedAnswer } from '../helpers/app';

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  installFakeHost({
    ...defaultHandlers(),
    'library.findBooks': (p) => [{ title: String(p.query), bookId: String(p.query), topics: [] }],
    'library.getBookToc': () => [{ text: 'סימן תקלט', index: 0, level: 1 }],
    'library.getBookContent': () => '<p>תוכן מקור</p>',
  });
  resetStores();
  appStore.set({ activeIssueId: 'issue-0240', activeWeekId: 'issue-0240-w1', screen: 'workspace' });
});

describe('WorkspaceScreen — מסך רחב', () => {
  it('מציג שלוש חלוניות: מבחן, תשובה, מקורות', () => {
    render(<WorkspaceScreen />);
    expect(screen.getByText('מבחן')).toBeInTheDocument();
    expect(screen.getByText('תשובה')).toBeInTheDocument();
    expect(screen.getByText('מקורות')).toBeInTheDocument();
  });

  it('סדר החלוניות RTL: מבחן, תשובה, מקורות', () => {
    const { container } = render(<WorkspaceScreen />);
    const titles = [...container.querySelectorAll('.pane > .pane-header > .pane-title')].map(
      (el) => el.textContent,
    );
    expect(titles.slice(0, 3)).toEqual(['מבחן', 'תשובה', 'מקורות']);
  });

  it('חלוניות המבחן והמקורות ניתנות לכיווץ, התשובה לא', () => {
    const { container } = render(<WorkspaceScreen />);
    const collapseButtons = [...container.querySelectorAll('.pane > .pane-header')]
      .slice(0, 3)
      .map((h) => !!h.querySelector('[title="כווץ"]'));
    expect(collapseButtons).toEqual([true, false, true]);
  });

  it('מציג את המבחן, עורך התשובה והמקורות של השבוע', () => {
    const { container } = render(<WorkspaceScreen />);
    expect(container.querySelectorAll('.exam-q').length).toBeGreaterThan(0);
    expect(container.querySelector('.answer-area')).toBeInTheDocument();
    expect(screen.getByText(/משנה ברורה ·/)).toBeInTheDocument();
  });

  it('התשובה השמורה נטענת לעורך', () => {
    seedAnswer('issue-0240-w1', { answerHtml: '<p>תשובה שמורה</p>', answerText: 'תשובה שמורה' });
    const { container } = render(<WorkspaceScreen />);
    expect((container.querySelector('.answer-area') as HTMLElement).innerHTML).toBe('<p>תשובה שמורה</p>');
  });

  it('החלפת שבוע מרכיבה מחדש את העורך עם התשובה הנכונה', () => {
    seedAnswer('issue-0240-w1', { answerHtml: '<p>ראשון</p>', answerText: 'ראשון' });
    seedAnswer('issue-0240-w2', { answerHtml: '<p>שני</p>', answerText: 'שני' });
    const { container, rerender } = render(<WorkspaceScreen />);
    expect((container.querySelector('.answer-area') as HTMLElement).innerHTML).toBe('<p>ראשון</p>');
    appStore.set({ activeWeekId: 'issue-0240-w2' });
    rerender(<WorkspaceScreen />);
    expect((container.querySelector('.answer-area') as HTMLElement).innerHTML).toBe('<p>שני</p>');
  });

  it('ללא שבוע פעיל — מציג הנחיה', () => {
    appStore.set({ activeWeekId: null });
    render(<WorkspaceScreen />);
    expect(screen.getByText("בחר שבוע מהמסך 'הספקים' כדי להתחיל לכתוב")).toBeInTheDocument();
  });
});

describe('WorkspaceScreen — מסך צר', () => {
  beforeEach(() => {
    appStore.set({ isNarrow: true });
  });

  it('מציג טאבים במקום חלוניות, ברירת המחדל "תשובה"', () => {
    const { container } = render(<WorkspaceScreen />);
    expect(container.querySelector('.ws-tabs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'תשובה' })).toHaveClass('active');
    expect(container.querySelector('.answer-area')).toBeInTheDocument();
  });

  it('מעבר לטאב "מבחן" מציג את המבחן בלבד', () => {
    const { container } = render(<WorkspaceScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'מבחן' }));
    expect(container.querySelectorAll('.exam-q').length).toBeGreaterThan(0);
    expect(container.querySelector('.answer-area')).not.toBeInTheDocument();
  });

  it('מעבר לטאב "מקורות" מציג את המקורות', () => {
    render(<WorkspaceScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'מקורות' }));
    expect(screen.getByText(/משנה ברורה ·/)).toBeInTheDocument();
  });

  it('חזרה לטאב "תשובה" מציגה שוב את העורך', () => {
    const { container } = render(<WorkspaceScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'מבחן' }));
    fireEvent.click(screen.getByRole('button', { name: 'תשובה' }));
    expect(container.querySelector('.answer-area')).toBeInTheDocument();
  });
});
