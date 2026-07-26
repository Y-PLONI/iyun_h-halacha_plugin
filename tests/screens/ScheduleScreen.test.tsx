import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScheduleScreen } from '../../src/screens/ScheduleScreen';
import { appStore } from '../../src/state/appStore';
import { getExamMeta, getWeeksForIssue } from '../../src/data/localData';
import { defaultHandlers, installFakeHost } from '../helpers/host';
import { prepareExams, resetStores, seedAnswer } from '../helpers/app';

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  installFakeHost(defaultHandlers());
  resetStores();
  appStore.set({ activeIssueId: 'issue-0240' });
});

describe('ScheduleScreen — סקירת הגליון', () => {
  it('מציג כותרת גליון, מספר שבועות והתקדמות', () => {
    render(<ScheduleScreen />);
    const exam = getExamMeta('issue-0240')!;
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`גליון ${exam.issueNumber}`);
    expect(screen.getByText('4 שבועות')).toBeInTheDocument();
    expect(screen.getByText('הושלמו 0 מתוך 4 שבועות')).toBeInTheDocument();
  });

  it('מעדכן את ההתקדמות ואת רוחב הסרגל לפי שבועות שהושלמו', () => {
    seedAnswer('issue-0240-w1', { status: 'completed' });
    seedAnswer('issue-0240-w2', { status: 'completed' });
    const { container } = render(<ScheduleScreen />);
    expect(screen.getByText('הושלמו 2 מתוך 4 שבועות')).toBeInTheDocument();
    expect(container.querySelector('.progress-bar')).toHaveAttribute('title', '50%');
    expect((container.querySelector('.progress-bar span') as HTMLElement).style.width).toBe('50%');
  });

  it('מציג כרטיס לכל שבוע בגליון', () => {
    const { container } = render(<ScheduleScreen />);
    expect(container.querySelectorAll('.week-card')).toHaveLength(getWeeksForIssue('issue-0240').length);
  });

  it('מציג הודעת ריק לגליון בלי שבועות', () => {
    appStore.set({ activeIssueId: 'issue-0000' });
    render(<ScheduleScreen />);
    expect(screen.getByText('לא נמצאו נתוני הספק לגליון זה')).toBeInTheDocument();
  });

  it('מציג את השבועות של הגליון הפעיל בלבד', () => {
    appStore.set({ activeIssueId: 'issue-0242' });
    const { container } = render(<ScheduleScreen />);
    expect(container.querySelectorAll('.week-card')).toHaveLength(5);
    expect(screen.getByText('פרשת עקב')).toBeInTheDocument();
  });
});

describe('ScheduleScreen — סינון', () => {
  it('סינון לפי סטטוס "הושלם" מציג רק שבועות שהושלמו', () => {
    seedAnswer('issue-0240-w2', { status: 'completed' });
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'הושלם' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(1);
    expect(screen.getByText('פרשת קרח')).toBeInTheDocument();
  });

  it('סינון "טיוטה" מציג רק טיוטות', () => {
    seedAnswer('issue-0240-w1', { status: 'draft' });
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'טיוטה' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(1);
  });

  it('סינון "טרם התחיל" מציג את השבועות שאין בהם תשובה', () => {
    seedAnswer('issue-0240-w1', { status: 'draft' });
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'טרם התחיל' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(3);
  });

  it('סינון לפי פרשה מציג שבוע אחד', () => {
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'חקת' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(1);
    expect(screen.getByText('פרשת חקת')).toBeInTheDocument();
  });

  it('סינון ללא תוצאות מציג הודעה', () => {
    render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'הושלם' }));
    expect(screen.getByText('אין שבועות התואמים את הסינון')).toBeInTheDocument();
  });

  it('"הכל" ו-"כל הפרשות" מחזירים את כל השבועות', () => {
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'חקת' }));
    fireEvent.click(screen.getByRole('button', { name: 'כל הפרשות' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(4);
  });

  it('הצ\'יפ הפעיל מסומן', () => {
    render(<ScheduleScreen />);
    expect(screen.getByRole('button', { name: 'הכל' })).toHaveClass('active');
    fireEvent.click(screen.getByRole('button', { name: 'טיוטה' }));
    expect(screen.getByRole('button', { name: 'טיוטה' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'הכל' })).not.toHaveClass('active');
  });

  it('שני סינונים יחד (סטטוס + פרשה)', () => {
    seedAnswer('issue-0240-w1', { status: 'draft' });
    seedAnswer('issue-0240-w2', { status: 'draft' });
    const { container } = render(<ScheduleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'טיוטה' }));
    fireEvent.click(screen.getByRole('button', { name: 'קרח' }));
    expect(container.querySelectorAll('.week-card')).toHaveLength(1);
    expect(screen.getByText('פרשת קרח')).toBeInTheDocument();
  });
});
