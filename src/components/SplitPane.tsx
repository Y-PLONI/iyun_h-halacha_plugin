import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { STORAGE_KEYS, storageGet, storageSet } from '../otzaria/storage';
import { Icon } from './Icon';

export interface PaneDef {
  id: string;
  title: string;
  /** גודל מינימלי באחוזים */
  minSize: number;
  /** גודל ברירת מחדל באחוזים */
  defaultSize: number;
  collapsible?: boolean;
  headerActions?: ReactNode;
  content: ReactNode;
}

interface SplitPaneProps {
  direction: 'horizontal' | 'vertical';
  panes: PaneDef[];
  /** מפתח ייחודי לשמירת הגדלים */
  storageKey: string;
}

const COLLAPSED = 3; // אחוז לתצוגה מקופלת (רק כותרת)

export function SplitPane({ direction, panes, storageKey }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(() => panes.map((p) => p.defaultSize));
  const [collapsed, setCollapsed] = useState<boolean[]>(() => panes.map(() => false));
  const drag = useRef<{ index: number; startPos: number; startSizes: number[] } | null>(null);

  // טעינת גדלים שמורים
  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await storageGet<Record<string, number[]>>(STORAGE_KEYS.splitSizes);
      const arr = saved?.[storageKey];
      if (alive && Array.isArray(arr) && arr.length === panes.length) setSizes(arr);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, panes.length]);

  const persist = useCallback(
    async (next: number[]) => {
      const saved = (await storageGet<Record<string, number[]>>(STORAGE_KEYS.splitSizes)) ?? {};
      saved[storageKey] = next;
      await storageSet(STORAGE_KEYS.splitSizes, saved);
    },
    [storageKey],
  );

  const isHoriz = direction === 'horizontal';

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      const el = containerRef.current;
      if (!d || !el) return;
      const total = isHoriz ? el.clientWidth : el.clientHeight;
      if (total <= 0) return;
      const pos = isHoriz ? e.clientX : e.clientY;
      // ב-RTL ציר ה-X הפוך: הזזה ימינה מקטינה את האינדקס הנמוך
      const rawDelta = pos - d.startPos;
      const deltaPct = ((isHoriz ? -rawDelta : rawDelta) / total) * 100;
      const next = [...d.startSizes];
      const a = d.index;
      const b = d.index + 1;
      const minA = panes[a].minSize;
      const minB = panes[b].minSize;
      let na = d.startSizes[a] + deltaPct;
      let nb = d.startSizes[b] - deltaPct;
      if (na < minA) {
        nb -= minA - na;
        na = minA;
      }
      if (nb < minB) {
        na -= minB - nb;
        nb = minB;
      }
      next[a] = na;
      next[b] = nb;
      setSizes(next);
    },
    [isHoriz, panes],
  );

  const endDrag = useCallback(() => {
    if (drag.current) {
      setSizes((s) => {
        void persist(s);
        return s;
      });
    }
    drag.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
  }, [onPointerMove, persist]);

  const startDrag = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = {
      index,
      startPos: isHoriz ? e.clientX : e.clientY,
      startSizes: [...sizes],
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
  };

  const resetSizes = () => {
    const def = panes.map((p) => p.defaultSize);
    setSizes(def);
    void persist(def);
  };

  const toggleCollapse = (index: number) => {
    setCollapsed((c) => c.map((v, i) => (i === index ? !v : v)));
  };

  // חישוב flex-basis אפקטיבי בהתחשב בקיפול
  const effective = panes.map((_, i) => (collapsed[i] ? COLLAPSED : Math.max(sizes[i], panes[i].minSize)));
  const sum = effective.reduce((s, v) => s + v, 0) || 1;

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: isHoriz ? 'row' : 'column', height: '100%', width: '100%' }}
    >
      {panes.map((pane, i) => (
        <FragmentPane
          key={pane.id}
          pane={pane}
          basis={(effective[i] / sum) * 100}
          collapsed={collapsed[i]}
          showResizer={i < panes.length - 1}
          direction={direction}
          onCollapse={() => toggleCollapse(i)}
          onResizerDown={(e) => startDrag(i, e)}
          onResizerDouble={resetSizes}
        />
      ))}
    </div>
  );
}

function FragmentPane({
  pane,
  basis,
  collapsed,
  showResizer,
  direction,
  onCollapse,
  onResizerDown,
  onResizerDouble,
}: {
  pane: PaneDef;
  basis: number;
  collapsed: boolean;
  showResizer: boolean;
  direction: 'horizontal' | 'vertical';
  onCollapse: () => void;
  onResizerDown: (e: React.PointerEvent) => void;
  onResizerDouble: () => void;
}) {
  return (
    <>
      <div className="pane" style={{ flex: `0 0 ${basis}%`, minWidth: 0, minHeight: 0 }}>
        <div className="pane-header">
          <span className="pane-title">{pane.title}</span>
          {!collapsed && pane.headerActions}
          {pane.collapsible && (
            <button className="icon-btn mini" title={collapsed ? 'הרחב' : 'כווץ'} onClick={onCollapse}>
              <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size="1em" />
            </button>
          )}
        </div>
        {!collapsed && <div className="pane-body">{pane.content}</div>}
      </div>
      {showResizer && (
        <div
          className={`resizer ${direction}`}
          onPointerDown={onResizerDown}
          onDoubleClick={onResizerDouble}
          title="גרור לשינוי גודל · לחיצה כפולה לאיפוס"
        />
      )}
    </>
  );
}
