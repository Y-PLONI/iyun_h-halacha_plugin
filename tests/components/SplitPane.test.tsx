import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SplitPane, type PaneDef } from '../../src/components/SplitPane';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';

let host: FakeHost;

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
});

const panes = (): PaneDef[] => [
  { id: 'a', title: 'חלונית א', minSize: 20, defaultSize: 40, collapsible: true, content: <div>תוכן א</div> },
  { id: 'b', title: 'חלונית ב', minSize: 20, defaultSize: 60, content: <div>תוכן ב</div> },
];

function basisOf(container: HTMLElement, index: number): number {
  const el = container.querySelectorAll('.pane')[index] as HTMLElement;
  return parseFloat(el.style.flexBasis);
}

/** מדמה רוחב מכולה, כי jsdom מחזיר 0 לכל clientWidth. */
function stubContainerWidth(container: HTMLElement, width: number): void {
  const root = container.firstElementChild as HTMLElement;
  Object.defineProperty(root, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(root, 'clientHeight', { value: width, configurable: true });
}

describe('SplitPane — רינדור', () => {
  it('מרנדר כותרת ותוכן לכל חלונית', () => {
    render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    expect(screen.getByText('חלונית א')).toBeInTheDocument();
    expect(screen.getByText('תוכן א')).toBeInTheDocument();
    expect(screen.getByText('תוכן ב')).toBeInTheDocument();
  });

  it('מחשב flex-basis מנורמל מהגדלים', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    expect(basisOf(container, 0)).toBeCloseTo(40, 1);
    expect(basisOf(container, 1)).toBeCloseTo(60, 1);
  });

  it('מרנדר מפריד בין חלוניות בלבד', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    expect(container.querySelectorAll('.resizer')).toHaveLength(1);
    expect(container.querySelector('.resizer')).toHaveClass('horizontal');
  });

  it('כיוון אנכי משפיע על flexDirection ועל class המפריד', () => {
    const { container } = render(<SplitPane direction="vertical" panes={panes()} storageKey="k" />);
    expect((container.firstElementChild as HTMLElement).style.flexDirection).toBe('column');
    expect(container.querySelector('.resizer')).toHaveClass('vertical');
  });

  it('מציג headerActions', () => {
    const withActions = panes();
    withActions[0].headerActions = <button>פעולה</button>;
    render(<SplitPane direction="horizontal" panes={withActions} storageKey="k" />);
    expect(screen.getByRole('button', { name: 'פעולה' })).toBeInTheDocument();
  });
});

describe('SplitPane — קיפול', () => {
  it('כיווץ מסתיר את התוכן ומקטין את החלונית', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    fireEvent.click(screen.getByTitle('כווץ'));
    expect(screen.queryByText('תוכן א')).not.toBeInTheDocument();
    expect(basisOf(container, 0)).toBeLessThan(10);
    expect(screen.getByTitle('הרחב')).toBeInTheDocument();
  });

  it('הרחבה מחזירה את התוכן', () => {
    render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    fireEvent.click(screen.getByTitle('כווץ'));
    fireEvent.click(screen.getByTitle('הרחב'));
    expect(screen.getByText('תוכן א')).toBeInTheDocument();
  });

  it('חלונית שאינה collapsible אינה מציגה כפתור כיווץ', () => {
    render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    expect(screen.getAllByTitle('כווץ')).toHaveLength(1);
  });

  it('כיווץ מסתיר גם את headerActions', () => {
    const withActions = panes();
    withActions[0].headerActions = <button>פעולה</button>;
    render(<SplitPane direction="horizontal" panes={withActions} storageKey="k" />);
    fireEvent.click(screen.getByTitle('כווץ'));
    expect(screen.queryByRole('button', { name: 'פעולה' })).not.toBeInTheDocument();
  });
});

describe('SplitPane — גרירה', () => {
  it('גרירה ב-RTL מקטינה את החלונית הימנית כשגוררים ימינה', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    stubContainerWidth(container, 1000);
    const resizer = container.querySelector('.resizer')!;
    fireEvent.pointerDown(resizer, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    expect(basisOf(container, 0)).toBeCloseTo(30, 1);
    expect(basisOf(container, 1)).toBeCloseTo(70, 1);
    fireEvent(window, new PointerEvent('pointerup'));
  });

  it('גרירה שמאלה מגדילה את החלונית הימנית', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    stubContainerWidth(container, 1000);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 400 }));
    expect(basisOf(container, 0)).toBeCloseTo(50, 1);
    fireEvent(window, new PointerEvent('pointerup'));
  });

  it('מכבד גודל מינימלי של שתי החלוניות', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    stubContainerWidth(container, 1000);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 5000 }));
    expect(basisOf(container, 0)).toBeGreaterThanOrEqual(20);
    fireEvent(window, new PointerEvent('pointermove', { clientX: -5000 }));
    expect(basisOf(container, 1)).toBeGreaterThanOrEqual(20);
    fireEvent(window, new PointerEvent('pointerup'));
  });

  it('שומר את הגדלים ב-storage בסיום הגרירה', async () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="workspace-v4" />);
    stubContainerWidth(container, 1000);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    fireEvent(window, new PointerEvent('pointerup'));
    await waitFor(() => {
      const saved = host.callsTo('storage.set').find((c) => c.payload.key === 'split-sizes:v2');
      expect(saved).toBeTruthy();
      const value = saved!.payload.value as Record<string, number[]>;
      expect(value['workspace-v4'][0]).toBeCloseTo(30, 1);
    });
  });

  it('גרירה משחזרת את userSelect בסיום', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 100 });
    expect(document.body.style.userSelect).toBe('none');
    fireEvent(window, new PointerEvent('pointerup'));
    expect(document.body.style.userSelect).toBe('');
  });

  it('לחיצה כפולה על המפריד מאפסת לגדלי ברירת המחדל', async () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    stubContainerWidth(container, 1000);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    fireEvent(window, new PointerEvent('pointerup'));
    fireEvent.doubleClick(container.querySelector('.resizer')!);
    expect(basisOf(container, 0)).toBeCloseTo(40, 1);
    await waitFor(() => {
      const saved = host.callsTo('storage.set').at(-1)!.payload.value as Record<string, number[]>;
      expect(saved.k).toEqual([40, 60]);
    });
  });
});

describe('SplitPane — שחזור גדלים', () => {
  it('טוען גדלים שמורים מ-storage', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'split-sizes:v2',
      value: { 'sources-v1': [25, 75] } as never,
    });
    const { container } = render(<SplitPane direction="vertical" panes={panes()} storageKey="sources-v1" />);
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(25, 1));
  });

  it('מתעלם מגדלים שמורים במספר חלוניות שונה', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'split-sizes:v2',
      value: { k: [10, 20, 70] } as never,
    });
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(40, 1));
  });

  it('מתעלם ממפתח storage של layout אחר', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'split-sizes:v2',
      value: { other: [10, 90] } as never,
    });
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(40, 1));
  });

  it('שמירה מצטברת אינה מוחקת layouts אחרים', async () => {
    await window.Otzaria.call('storage.set', {
      key: 'split-sizes:v2',
      value: { other: [10, 90] } as never,
    });
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    stubContainerWidth(container, 1000);
    fireEvent.doubleClick(container.querySelector('.resizer')!);
    await waitFor(() => {
      const saved = host.callsTo('storage.set').at(-1)!.payload.value as Record<string, number[]>;
      expect(saved.other).toEqual([10, 90]);
      expect(saved.k).toEqual([40, 60]);
    });
  });
});
