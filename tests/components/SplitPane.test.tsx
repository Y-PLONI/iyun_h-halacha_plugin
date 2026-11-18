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

  it('החלוניות מתכווצות (flex-shrink) כדי לפנות מקום למפרידים — בלי גלישה של המכל', () => {
    const { container } = render(<SplitPane direction="horizontal" panes={panes()} storageKey="k" />);
    for (const el of container.querySelectorAll<HTMLElement>('.pane')) {
      expect(el.style.flexGrow).toBe('0');
      expect(el.style.flexShrink).toBe('1');
    }
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

  it('חלונית headerless: בלי כותרת וכפתור כיווץ, התוכן מוצג, והכותרת משמשת כשם נגיש', () => {
    const p = panes();
    p[0] = { ...p[0], headerless: true };
    const { container } = render(<SplitPane direction="horizontal" panes={p} storageKey="k" />);
    const first = container.querySelectorAll('.pane')[0];
    expect(first.querySelector('.pane-header')).toBeNull();
    expect(screen.queryByText('חלונית א')).not.toBeInTheDocument();
    expect(screen.queryByTitle('כווץ')).not.toBeInTheDocument();
    expect(screen.getByText('תוכן א')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'חלונית א' })).toBe(first);
    // החלונית השנייה רגילה, והמפריד ביניהן נשאר
    expect(container.querySelectorAll('.pane')[1].querySelector('.pane-header')).not.toBeNull();
    expect(container.querySelectorAll('.resizer')).toHaveLength(1);
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

describe('SplitPane — שינוי מספר החלוניות', () => {
  const nPanes = (n: number): PaneDef[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      title: `חלונית ${i}`,
      minSize: 10,
      defaultSize: 100 / n,
      content: <div>תוכן {i}</div>,
    }));

  const allBases = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.pane')).map((el) => parseFloat((el as HTMLElement).style.flexBasis));

  it('גרירה עובדת אחרי שמספר החלוניות עלה מ-3 ל-4', () => {
    const { container, rerender } = render(<SplitPane direction="horizontal" panes={nPanes(3)} storageKey="grow" />);
    rerender(<SplitPane direction="horizontal" panes={nPanes(4)} storageKey="grow" />);
    stubContainerWidth(container, 1000);
    const before = allBases(container);
    expect(before).toHaveLength(4);
    fireEvent.pointerDown(container.querySelectorAll('.resizer')[1], { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    const after = allBases(container);
    fireEvent(window, new PointerEvent('pointerup'));
    expect(after).toHaveLength(4);
    after.forEach((v) => expect(Number.isFinite(v)).toBe(true));
    expect(after[1]).toBeCloseTo(before[1] - 10, 1);
    expect(after[2]).toBeCloseTo(before[2] + 10, 1);
  });

  it('גרירה עובדת אחרי שמספר החלוניות ירד מ-4 ל-3', () => {
    const { container, rerender } = render(<SplitPane direction="horizontal" panes={nPanes(4)} storageKey="shrink" />);
    rerender(<SplitPane direction="horizontal" panes={nPanes(3)} storageKey="shrink" />);
    stubContainerWidth(container, 1000);
    const before = allBases(container);
    expect(before).toHaveLength(3);
    fireEvent.pointerDown(container.querySelectorAll('.resizer')[1], { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    const after = allBases(container);
    fireEvent(window, new PointerEvent('pointerup'));
    expect(after).toHaveLength(3);
    after.forEach((v) => expect(Number.isFinite(v)).toBe(true));
    expect(after[1]).toBeCloseTo(before[1] - 10, 1);
    expect(after[2]).toBeCloseTo(before[2] + 10, 1);
  });

  const collapsiblePanes = (n: number): PaneDef[] => nPanes(n).map((p) => ({ ...p, collapsible: true }));

  it('כיווץ החלונית הרביעית עובד אחרי שמספר החלוניות עלה מ-3 ל-4', () => {
    const { container, rerender } = render(
      <SplitPane direction="vertical" panes={collapsiblePanes(3)} storageKey="grow-c" />,
    );
    rerender(<SplitPane direction="vertical" panes={collapsiblePanes(4)} storageKey="grow-c" />);
    expect(screen.getAllByTitle('כווץ')).toHaveLength(4);
    fireEvent.click(screen.getAllByTitle('כווץ')[3]);
    expect(screen.queryByText('תוכן 3')).not.toBeInTheDocument();
    expect(screen.getByText('תוכן 0')).toBeInTheDocument();
    expect(basisOf(container, 3)).toBeLessThan(10);
    fireEvent.click(screen.getByTitle('הרחב'));
    expect(screen.getByText('תוכן 3')).toBeInTheDocument();
  });

  it('מצב הכיווץ צמוד לחלונית (לפי id) ולא לאינדקס כשחלונית מוסרת', () => {
    const { rerender } = render(<SplitPane direction="vertical" panes={collapsiblePanes(4)} storageKey="shrink-c" />);
    // מכווצים את p2, ואז מסירים את p1 — p2 עובר לאינדקס 1 וצריך להישאר מכווץ
    fireEvent.click(screen.getAllByTitle('כווץ')[2]);
    const without1 = collapsiblePanes(4).filter((p) => p.id !== 'p1');
    rerender(<SplitPane direction="vertical" panes={without1} storageKey="shrink-c" />);
    expect(screen.queryByText('תוכן 2')).not.toBeInTheDocument();
    expect(screen.getByText('תוכן 3')).toBeInTheDocument();
    expect(screen.getAllByTitle('כווץ')).toHaveLength(2);
    fireEvent.click(screen.getAllByTitle('כווץ')[1]);
    expect(screen.queryByText('תוכן 3')).not.toBeInTheDocument();
  });

  const savedSizes = async () =>
    ((await window.Otzaria.call('storage.get', { key: 'split-sizes:v2' })).data ?? {}) as Record<string, number[]>;

  /** גרירה של המפריד הראשון ב-100px (מתוך 1000) ושמירה. */
  const dragFirstResizer = (container: HTMLElement) => {
    stubContainerWidth(container, 1000);
    fireEvent.pointerDown(container.querySelector('.resizer')!, { clientX: 500 });
    fireEvent(window, new PointerEvent('pointermove', { clientX: 600 }));
    fireEvent(window, new PointerEvent('pointerup'));
  };

  it('גדלים שמורים (פורמט ישן) של 3 חלוניות נטענים, ו-4 חלוניות מתחילות מברירת המחדל', async () => {
    await window.Otzaria.call('storage.set', { key: 'split-sizes:v2', value: { legacy: [50, 30, 20] } as never });
    const { container, rerender } = render(<SplitPane direction="vertical" panes={nPanes(3)} storageKey="legacy" />);
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(50, 1));
    const loadsBefore = host.callsTo('storage.get').length;
    rerender(<SplitPane direction="vertical" panes={nPanes(4)} storageKey="legacy" />);
    // מחכים שהטעינה מחדש (בעקבות שינוי מספר החלוניות) תסתיים — ורק אז בודקים שלא הוחלו גדלים
    // באורך שגוי, אלא ברירת המחדל
    await waitFor(() => expect(host.callsTo('storage.get').length).toBeGreaterThan(loadsBefore));
    await new Promise((r) => setTimeout(r, 0));
    expect(basisOf(container, 0)).toBeCloseTo(25, 1);
    // חזרה ל-3 חלוניות: הגדלים הישנים עדיין שם ונטענים
    rerender(<SplitPane direction="vertical" panes={nPanes(3)} storageKey="legacy" />);
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(50, 1));
    expect((await savedSizes()).legacy).toEqual([50, 30, 20]);
  });

  it('לכל מספר חלוניות נשמרים גדלים משלו, בלי לדרוס את הגדלים הישנים', async () => {
    await window.Otzaria.call('storage.set', { key: 'split-sizes:v2', value: { both: [50, 30, 20] } as never });
    const four = render(<SplitPane direction="horizontal" panes={nPanes(4)} storageKey="both" />);
    await waitFor(() => expect(host.callsTo('storage.get').length).toBeGreaterThan(0));
    dragFirstResizer(four.container);
    await waitFor(async () => expect((await savedSizes())['both#4']?.[0]).toBeCloseTo(15, 1));
    expect((await savedSizes()).both).toEqual([50, 30, 20]);
    four.unmount();

    // remount: כל layout טוען את הגדלים שלו
    const again4 = render(<SplitPane direction="horizontal" panes={nPanes(4)} storageKey="both" />);
    await waitFor(() => expect(basisOf(again4.container, 0)).toBeCloseTo(15, 1));
    again4.unmount();
    const again3 = render(<SplitPane direction="horizontal" panes={nPanes(3)} storageKey="both" />);
    await waitFor(() => expect(basisOf(again3.container, 0)).toBeCloseTo(50, 1));

    // שמירה ב-3 חלוניות ממשיכה לכתוב למפתח הראשי, ולא נוגעת ב-#4
    dragFirstResizer(again3.container);
    await waitFor(async () => expect((await savedSizes()).both[0]).toBeCloseTo(40, 1));
    expect((await savedSizes())['both#4'][0]).toBeCloseTo(15, 1);
  });

  it('כשאין שום ערך שמור — השמירה הראשונה הולכת למפתח הראשי', async () => {
    const { container } = render(<SplitPane direction="horizontal" panes={nPanes(4)} storageKey="fresh" />);
    dragFirstResizer(container);
    await waitFor(async () => expect((await savedSizes()).fresh?.[0]).toBeCloseTo(15, 1));
    expect((await savedSizes())['fresh#4']).toBeUndefined();
  });

  it('מתעלם מערכים שמורים פגומים (לא מספרים)', async () => {
    await window.Otzaria.call('storage.set', { key: 'split-sizes:v2', value: { bad: [10, null, 'x'] } as never });
    const { container } = render(<SplitPane direction="horizontal" panes={nPanes(3)} storageKey="bad" />);
    await waitFor(() => expect(host.callsTo('storage.get').length).toBeGreaterThan(0));
    await waitFor(() => expect(basisOf(container, 0)).toBeCloseTo(100 / 3, 1));
  });
});
