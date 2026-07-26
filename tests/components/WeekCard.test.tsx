import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ExamView } from '../../src/components/ExamView';
import { WeekCard } from '../../src/components/WeekCard';
import { appStore } from '../../src/state/appStore';
import { getExamWeek } from '../../src/data/localData';
import { defaultHandlers, installFakeHost } from '../helpers/host';
import { prepareExams, realWeek, resetStores, seedAnswer } from '../helpers/app';
import { makeWeek } from '../helpers/fixtures';

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  installFakeHost(defaultHandlers());
  resetStores();
});

describe('WeekCard', () => {
  it('מציג מספר שבוע, פרשה, טווח סימנים ונושא', () => {
    const week = realWeek('issue-0240-w1');
    render(<WeekCard week={week} />);
    expect(screen.getByText(`שבוע ${week.weekNumber}/${week.weeksInIssue}`)).toBeInTheDocument();
    expect(screen.getByText(`פרשת ${week.parasha}`)).toBeInTheDocument();
    expect(screen.getByText(week.sourceRangeTitle)).toBeInTheDocument();
    if (week.topicTitle) expect(screen.getByText(week.topicTitle)).toBeInTheDocument();
  });

  it('מציג סטטוס "טרם התחיל" לשבוע ללא תשובה', () => {
    render(<WeekCard week={realWeek('issue-0240-w1')} />);
    expect(screen.getByText('טרם התחיל')).toBeInTheDocument();
  });

  it('מציג "טיוטה" ו-"הושלם" לפי מצב התשובה', () => {
    seedAnswer('issue-0240-w1', { status: 'draft' });
    const { rerender } = render(<WeekCard week={realWeek('issue-0240-w1')} />);
    expect(screen.getByText('טיוטה')).toBeInTheDocument();
    act(() => seedAnswer('issue-0240-w1', { status: 'completed' }));
    rerender(<WeekCard week={realWeek('issue-0240-w1')} />);
    expect(screen.getByText('הושלם')).toBeInTheDocument();
  });

  it('מציג "אין מבחן" לשבוע בלי מסמך מבחן', () => {
    render(<WeekCard week={makeWeek()} />);
    expect(screen.getByText('אין מבחן')).toBeInTheDocument();
  });

  it('לחיצה על הכרטיס פותחת את סביבת הכתיבה', () => {
    const { container } = render(<WeekCard week={realWeek('issue-0240-w3')} />);
    fireEvent.click(container.querySelector('.week-card')!);
    expect(appStore.get()).toMatchObject({ screen: 'workspace', activeWeekId: 'issue-0240-w3' });
  });

  it('כפתור "מבחן" פותח את מסך השאלות בלי להפעיל את לחיצת הכרטיס', () => {
    render(<WeekCard week={realWeek('issue-0240-w2')} />);
    fireEvent.click(screen.getByRole('button', { name: 'מבחן' }));
    expect(appStore.get()).toMatchObject({ screen: 'questions', activeWeekId: 'issue-0240-w2' });
  });

  it('כפתור "כתיבה" פותח את סביבת הכתיבה', () => {
    render(<WeekCard week={realWeek('issue-0240-w4')} />);
    fireEvent.click(screen.getByRole('button', { name: 'כתיבה' }));
    expect(appStore.get()).toMatchObject({ screen: 'workspace', activeWeekId: 'issue-0240-w4' });
  });
});

describe('ExamView', () => {
  it('מציג את כותרת השבוע, טווח הסימנים והשאלות מהמסמך', () => {
    const week = realWeek('issue-0240-w1');
    const exam = getExamWeek(week)!;
    const { container } = render(<ExamView week={week} />);
    expect(screen.getByText(`שבוע ${week.weekNumber}/${week.weeksInIssue}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(exam.headerText);
    expect(container.querySelector('.exam-range')).toHaveTextContent(exam.sourceRangeTitle);
    expect(container.querySelectorAll('.exam-q').length).toBeGreaterThan(0);
  });

  it('מציג אות שאלה לכל שאלה', () => {
    const { container } = render(<ExamView week={realWeek('issue-0240-w1')} />);
    const letters = [...container.querySelectorAll('.exam-q-letter')].map((el) => el.textContent);
    expect(letters.length).toBeGreaterThan(0);
    expect(letters[0]).toMatch(/^[א-ת]\]$/);
  });

  it('מציג הודעת ריק כשאין מסמך מבחן לשבוע', () => {
    render(<ExamView week={makeWeek()} />);
    expect(screen.getByText('מסמך המבחן אינו זמין לשבוע זה')).toBeInTheDocument();
  });

  it('כל שבועות הגליונות מרונדרים עם שאלות', () => {
    for (const weekId of ['issue-0239-w1', 'issue-0240-w2', 'issue-0241-w3', 'issue-0242-w5']) {
      const { container, unmount } = render(<ExamView week={realWeek(weekId)} />);
      expect(container.querySelectorAll('.exam-q').length, weekId).toBeGreaterThan(0);
      unmount();
    }
  });
});
