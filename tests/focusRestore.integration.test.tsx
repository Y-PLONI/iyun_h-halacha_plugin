import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App';
import { AnswerEditor } from '../src/components/AnswerEditor';
import { getAnswer } from '../src/state/answersStore';
import { installFocusRestore } from '../src/utils/restoreFocus';
import { defaultHandlers, installFakeHost, type FakeHost } from './helpers/host';
import { prepareExams, realWeek, resetStores } from './helpers/app';

let host: FakeHost;

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
  resetStores();
});

afterEach(() => {
  vi.useRealTimers();
});

function editor(): HTMLDivElement {
  return document.querySelector('.answer-area') as HTMLDivElement;
}

describe('שחזור מיקוד — אינטגרציה', () => {
  it('האפליקציה נרשמת לאירועי השהיה וחזרה ומסירה אותם בפירוק', async () => {
    const { unmount } = render(<App />);
    await act(async () => {
      host.emit('plugin.boot', {});
    });
    await waitFor(() => expect(screen.queryByText('טוען…')).not.toBeInTheDocument());
    expect(host.listenerCount('plugin.suspended')).toBe(1);
    expect(host.listenerCount('plugin.resumed')).toBe(1);
    unmount();
    expect(host.listenerCount('plugin.suspended')).toBe(0);
    expect(host.listenerCount('plugin.resumed')).toBe(0);
  });

  it('האפליקציה נרשמת פעם אחת בלבד גם תחת StrictMode', async () => {
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => {
      host.emit('plugin.boot', {});
    });
    await waitFor(() => expect(screen.queryByText('טוען…')).not.toBeInTheDocument());
    expect(host.listenerCount('plugin.resumed')).toBe(1);
  });

  it('אחרי מעבר טאב העורך ממוקד וההקלדה נשמרת ב-store', () => {
    vi.useFakeTimers();
    const dispose = installFocusRestore();
    render(<AnswerEditor week={realWeek('issue-0240-w1')} />);
    const el = editor();
    el.tabIndex = 0;
    el.focus();
    host.emit('plugin.suspended', null);
    el.blur();
    host.emit('plugin.resumed', null);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(document.activeElement).toBe(el);
    (document.activeElement as HTMLElement).textContent = 'הקלדה אחרי חזרה';
    fireEvent.input(document.activeElement as HTMLElement);
    expect(getAnswer('issue-0240-w1')!.answerText).toBe('הקלדה אחרי חזרה');
    dispose();
  });

  it('שדות הכלי בסרגל העורך אינם מאבדים מיקוד בעקבות החזרה', () => {
    vi.useFakeTimers();
    const dispose = installFocusRestore();
    render(<AnswerEditor week={realWeek('issue-0240-w1')} />);
    const bold = screen.getByTitle('מודגש');
    bold.focus();
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(document.activeElement).toBe(bold);
    dispose();
  });

  it('החלפת שבוע בזמן השהיה אינה זורקת', () => {
    vi.useFakeTimers();
    const dispose = installFocusRestore();
    const { rerender } = render(<AnswerEditor key="a" week={realWeek('issue-0240-w1')} />);
    editor().tabIndex = 0;
    editor().focus();
    host.emit('plugin.suspended', null);
    rerender(<AnswerEditor key="b" week={realWeek('issue-0240-w2')} />);
    host.emit('plugin.resumed', null);
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }).not.toThrow();
    dispose();
  });
});
