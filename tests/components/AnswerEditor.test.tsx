import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AnswerEditor } from '../../src/components/AnswerEditor';
import { answersStore, getAnswer } from '../../src/state/answersStore';
import { defaultHandlers, installFakeHost } from '../helpers/host';
import { prepareExams, realWeek, resetStores, seedAnswer } from '../helpers/app';

const week = () => realWeek('issue-0240-w1');

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  installFakeHost(defaultHandlers());
  resetStores();
});

function editor(): HTMLDivElement {
  return document.querySelector('.answer-area') as HTMLDivElement;
}

describe('AnswerEditor — עריכה ושמירה', () => {
  it('מרנדר אזור עריכה RTL עם placeholder', () => {
    render(<AnswerEditor week={week()} />);
    const el = editor();
    expect(el).toHaveAttribute('contenteditable', 'true');
    expect(el).toHaveAttribute('dir', 'rtl');
    expect(el).toHaveAttribute('data-placeholder', 'כתוב כאן את תשובותיך לשבוע זה…');
  });

  it('טוען את התשובה השמורה של השבוע', () => {
    seedAnswer('issue-0240-w1', { answerHtml: '<p>תשובה קיימת</p>', answerText: 'תשובה קיימת' });
    render(<AnswerEditor week={week()} />);
    expect(editor().innerHTML).toBe('<p>תשובה קיימת</p>');
  });

  it('הקלדה מעדכנת את ה-store עם HTML מנוקה, טקסט וספירת מילים', () => {
    render(<AnswerEditor week={week()} />);
    const el = editor();
    el.innerHTML = '<p onclick="alert(1)">שלוש מילים כאן</p>';
    fireEvent.input(el);
    const rec = getAnswer('issue-0240-w1')!;
    expect(rec.answerHtml).toBe('<p>שלוש מילים כאן</p>');
    expect(rec.answerText).toBe('שלוש מילים כאן');
    expect(rec.wordCount).toBe(3);
    expect(rec.status).toBe('draft');
  });

  it('מסיר סקריפטים מהתוכן שנשמר', () => {
    render(<AnswerEditor week={week()} />);
    const el = editor();
    el.innerHTML = '<p>טקסט</p><script>alert(1)</script>';
    fireEvent.input(el);
    expect(getAnswer('issue-0240-w1')!.answerHtml).not.toContain('<script');
  });

  it('מציג ספירת מילים ומצב שמירה', () => {
    render(<AnswerEditor week={week()} />);
    expect(screen.getByText('0 מילים')).toBeInTheDocument();
    expect(screen.getByText('✓ נשמר')).toBeInTheDocument();

    const el = editor();
    el.innerHTML = '<p>שתי מילים</p>';
    fireEvent.input(el);
    expect(screen.getByText('2 מילים')).toBeInTheDocument();
    expect(screen.getByText('● לא נשמר')).toBeInTheDocument();
  });

  it('מציג מצב "שומר" ו-"שגיאת שמירה"', () => {
    render(<AnswerEditor week={week()} />);
    act(() => answersStore.set({ saveStatus: 'saving' }));
    expect(screen.getByText('… שומר')).toBeInTheDocument();
    act(() => answersStore.set({ saveStatus: 'error' }));
    expect(screen.getByText('⚠ שגיאת שמירה')).toBeInTheDocument();
  });

  it('החלפת שבוע טוענת את התשובה של השבוע החדש', () => {
    seedAnswer('issue-0240-w1', { answerHtml: '<p>ראשון</p>', answerText: 'ראשון' });
    seedAnswer('issue-0240-w2', { answerHtml: '<p>שני</p>', answerText: 'שני' });
    const { rerender } = render(<AnswerEditor week={week()} />);
    expect(editor().innerHTML).toBe('<p>ראשון</p>');
    rerender(<AnswerEditor week={realWeek('issue-0240-w2')} />);
    expect(editor().innerHTML).toBe('<p>שני</p>');
  });
});

describe('AnswerEditor — סרגל עיצוב', () => {
  const buttons: [string, string][] = [
    ['מודגש', 'bold'],
    ['נטוי', 'italic'],
    ['קו תחתון', 'underline'],
    ['רשימה ממוספרת', 'insertOrderedList'],
    ['רשימת תבליטים', 'insertUnorderedList'],
    ['בטל', 'undo'],
    ['חזור', 'redo'],
  ];

  it.each(buttons)('כפתור "%s" מפעיל את הפקודה %s', (title, command) => {
    render(<AnswerEditor week={week()} />);
    fireEvent.click(screen.getByTitle(title));
    expect(document.execCommand).toHaveBeenCalledWith(command, false, undefined);
  });

  it('כפתור ניקוי עיצוב מפעיל removeFormat', () => {
    render(<AnswerEditor week={week()} />);
    fireEvent.click(screen.getByTitle('ניקוי עיצוב'));
    expect(document.execCommand).toHaveBeenCalledWith('removeFormat');
  });

  it('פעולת עיצוב שומרת את התוכן המעודכן', () => {
    render(<AnswerEditor week={week()} />);
    editor().innerHTML = '<p><strong>מודגש</strong></p>';
    fireEvent.click(screen.getByTitle('מודגש'));
    expect(getAnswer('issue-0240-w1')?.answerHtml).toBe('<p><strong>מודגש</strong></p>');
  });

  it('כפתורי העיצוב אינם גוזלים פוקוס (mouseDown מנוטרל)', () => {
    render(<AnswerEditor week={week()} />);
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    fireEvent(screen.getByTitle('מודגש'), event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('AnswerEditor — הדבקה', () => {
  it('הדבקה מוכנסת כטקסט נקי בלבד', () => {
    render(<AnswerEditor week={week()} />);
    const el = editor();
    el.focus();
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
      clipboardData: { getData: (t: string) => string };
    };
    paste.clipboardData = { getData: () => 'טקסט מודבק' };
    fireEvent(el, paste);
    expect(paste.defaultPrevented).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'טקסט מודבק');
  });
});

describe('AnswerEditor — סימון הושלם', () => {
  it('מסמן ומבטל סימון "הושלם"', () => {
    render(<AnswerEditor week={week()} />);
    fireEvent.click(screen.getByRole('button', { name: 'סמן כהושלם' }));
    expect(getAnswer('issue-0240-w1')?.status).toBe('completed');
    const done = screen.getByRole('button', { name: '✓ הושלם' });
    expect(done).toHaveClass('primary');
    fireEvent.click(done);
    expect(getAnswer('issue-0240-w1')?.status).toBe('draft');
  });

  it('מציג "✓ הושלם" לשבוע שהושלם', () => {
    seedAnswer('issue-0240-w1', { status: 'completed' });
    render(<AnswerEditor week={week()} />);
    expect(screen.getByRole('button', { name: '✓ הושלם' })).toBeInTheDocument();
  });
});

describe('AnswerEditor — שמירה אוטומטית', () => {
  it('התוכן נשמר ל-storage לאחר ההשהייה', async () => {
    vi.useFakeTimers();
    const host = installFakeHost(defaultHandlers());
    render(<AnswerEditor week={week()} />);
    const el = editor();
    el.innerHTML = '<p>תשובה לשמירה</p>';
    fireEvent.input(el);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    const saved = host.callsTo('storage.set').find((c) => c.payload.key === 'answers:v2');
    expect(saved).toBeTruthy();
    expect(JSON.stringify(saved!.payload.value)).toContain('תשובה לשמירה');
    expect(screen.getByText('✓ נשמר')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
