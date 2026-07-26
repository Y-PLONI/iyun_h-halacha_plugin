import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { EmptyState } from '../../src/components/EmptyState';
import { Icon } from '../../src/components/Icon';
import { StatusBadge } from '../../src/components/StatusBadge';
import { ToastHost, toast } from '../../src/components/Toast';
import { ICON_EM, ICON_PATHS } from '../../src/icons/fluent';

describe('StatusBadge', () => {
  it('מציג תווית לכל סטטוס עם class תואם', () => {
    const cases = [
      ['not-started', 'טרם התחיל'],
      ['draft', 'טיוטה'],
      ['completed', 'הושלם'],
      ['missing-data', 'אין מבחן'],
    ] as const;
    for (const [status, label] of cases) {
      const { container, unmount } = render(
        <StatusBadge progress={{ status, wordCount: 0 }} />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.firstElementChild).toHaveClass('status-badge', status);
      unmount();
    }
  });
});

describe('Icon', () => {
  it('מרנדר SVG עם ה-path של האייקון וב-viewBox הנכון', () => {
    const { container } = render(<Icon name="settings" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', `0 0 ${ICON_EM} ${ICON_EM}`);
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg.querySelector('path')).toHaveAttribute('d', ICON_PATHS.settings);
  });

  it('הופך את ה-glyph (Y-up) עם matrix', () => {
    const { container } = render(<Icon name="mail" />);
    expect(container.querySelector('path')).toHaveAttribute('transform', `matrix(1 0 0 -1 0 ${ICON_EM})`);
  });

  it('גודל מותאם מוגדר כ-width/height', () => {
    const { container } = render(<Icon name="mail" size="1em" />);
    const svg = container.querySelector('svg')!;
    expect(svg.style.width).toBe('1em');
    expect(svg.style.height).toBe('1em');
  });

  it('ללא title — aria-hidden; עם title — role=img ו-aria-label', () => {
    const { container, unmount } = render(<Icon name="mail" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    unmount();
    render(<Icon name="mail" title="מייל" />);
    expect(screen.getByRole('img', { name: 'מייל' })).toBeInTheDocument();
  });

  it('אייקון לא קיים אינו מרנדר דבר', () => {
    const { container } = render(<Icon name={'no-such-icon' as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('כל האייקונים בשימוש קיימים בסט', () => {
    for (const name of [
      'settings', 'download', 'mail', 'sync', 'open', 'bold', 'italic', 'underline',
      'list-ordered', 'list-bullet', 'undo', 'redo', 'clear-format', 'chevron-down',
      'chevron-up', 'book-open', 'document', 'search', 'edit', 'filter', 'info',
      'dismiss', 'font', 'alert', 'calendar',
    ]) {
      expect(ICON_PATHS[name], name).toBeTruthy();
    }
  });
});

describe('EmptyState', () => {
  it('מציג כותרת ואייקון ברירת מחדל', () => {
    const { container } = render(<EmptyState title="אין נתונים" />);
    expect(screen.getByText('אין נתונים')).toBeInTheDocument();
    expect(container.querySelector('svg path')).toHaveAttribute('d', ICON_PATHS.document);
  });

  it('מציג אייקון מותאם ותוכן בנים', () => {
    const { container } = render(
      <EmptyState icon="filter" title="אין תוצאות">
        <button>נקה סינון</button>
      </EmptyState>,
    );
    expect(container.querySelector('svg path')).toHaveAttribute('d', ICON_PATHS.filter);
    expect(screen.getByRole('button', { name: 'נקה סינון' })).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('מוצג בקריאה ל-toast ונעלם אחרי 2.6 שניות', () => {
    vi.useFakeTimers();
    const { container } = render(<ToastHost />);
    const el = container.firstElementChild!;
    expect(el).not.toHaveClass('show');

    act(() => toast('נשמר בהצלחה'));
    expect(el).toHaveClass('show');
    expect(el).toHaveTextContent('נשמר בהצלחה');

    act(() => vi.advanceTimersByTime(2600));
    expect(el).not.toHaveClass('show');
    vi.useRealTimers();
  });

  it('הודעה חדשה מאפסת את הטיימר', () => {
    vi.useFakeTimers();
    const { container } = render(<ToastHost />);
    const el = container.firstElementChild!;
    act(() => toast('ראשונה'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => toast('שניה'));
    act(() => vi.advanceTimersByTime(2000));
    expect(el).toHaveClass('show');
    expect(el).toHaveTextContent('שניה');
    act(() => vi.advanceTimersByTime(600));
    expect(el).not.toHaveClass('show');
    vi.useRealTimers();
  });

  it('יש role=status לנגישות', () => {
    render(<ToastHost />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('קריאה ל-toast ללא host אינה זורקת', () => {
    expect(() => toast('אין מי שיציג')).not.toThrow();
  });
});
