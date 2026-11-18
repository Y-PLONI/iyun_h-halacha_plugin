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
  /**
   * חלונית בלי כותרת משלה — למשל חלונית שכל תוכנה הוא SplitPane מקונן שלחלוניותיו כותרות
   * משלהן (אחרת מוצגת כותרת כפולה). אין לה כפתור כיווץ ולא headerActions.
   */
  headerless?: boolean;
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

type SavedSizes = Record<string, number[]>;

/**
 * מפתח משני לגדלים של layout במספר חלוניות אחר מזה שכבר שמור תחת storageKey
 * (למשל חלונית אופציונלית שמופיעה רק לפעמים) — כך לכל מספר חלוניות נשמרים גדלים משלו.
 */
const countKey = (storageKey: string, count: number) => `${storageKey}#${count}`;

function isSizes(v: unknown, count: number): v is number[] {
  return Array.isArray(v) && v.length === count && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

/** הגדלים השמורים למספר החלוניות הנתון: קודם המפתח הראשי (תאימות לאחור), אחר כך המשני. */
function pickSaved(saved: SavedSizes | null | undefined, storageKey: string, count: number): number[] | null {
  const primary = saved?.[storageKey];
  if (isSizes(primary, count)) return primary;
  const secondary = saved?.[countKey(storageKey, count)];
  return isSizes(secondary, count) ? secondary : null;
}

export function SplitPane({ direction, panes, storageKey }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(() => panes.map((p) => p.defaultSize));
  // מצב הכיווץ לפי id של החלונית (ולא לפי אינדקס), כדי שיישאר נכון כשחלוניות נוספות/מוסרות
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const drag = useRef<{ index: number; startPos: number; startSizes: number[]; latest: number[] } | null>(null);

  // (כשמספר החלוניות משתנה בין רינדורים — למשל חלונית שמופיעה אחרי בדיקה אסינכרונית —
  // עובדים על גדלי ברירת המחדל באורך הנכון עד שהגדלים השמורים נטענים, כדי לא לקבל NaN.)
  const sizesNow = sizes.length === panes.length ? sizes : panes.map((p) => p.defaultSize);

  // טעינת גדלים שמורים
  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await storageGet<SavedSizes>(STORAGE_KEYS.splitSizes);
      if (!alive) return;
      // אין ערך שמור באורך תואם: גוזרים גדלים מהחלוניות הנוכחיות
      setSizes(pickSaved(saved, storageKey, panes.length) ?? panes.map((p) => p.defaultSize));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, panes.length]);

  const persist = useCallback(
    async (next: number[]) => {
      const saved = (await storageGet<SavedSizes>(STORAGE_KEYS.splitSizes)) ?? {};
      // המפתח הראשי שומר על הפורמט הקיים; רק אם כבר שמור בו layout במספר חלוניות אחר,
      // הגדלים נשמרים במפתח משני — כדי לא לדרוס את הגדלים של ה-layout האחר.
      const primary = saved[storageKey];
      if (!Array.isArray(primary) || primary.length === next.length) saved[storageKey] = next;
      else saved[countKey(storageKey, next.length)] = next;
      await storageSet(STORAGE_KEYS.splitSizes, saved);
    },
    [storageKey],
  );

  const isHoriz = direction === 'horizontal';

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      const el = containerRef.current;
      if (!d || !el || !panes[d.index] || !panes[d.index + 1]) return;
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
      d.latest = next;
      setSizes(next);
    },
    [isHoriz, panes],
  );

  const endDrag = useCallback(() => {
    if (drag.current) {
      void persist(drag.current.latest);
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
      startSizes: [...sizesNow],
      latest: [...sizesNow],
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

  const toggleCollapse = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  };

  // חישוב flex-basis אפקטיבי בהתחשב בקיפול
  const effective = panes.map((p, i) => (collapsed[p.id] ? COLLAPSED : Math.max(sizesNow[i], p.minSize)));
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
          collapsed={!!collapsed[pane.id]}
          showResizer={i < panes.length - 1}
          direction={direction}
          onCollapse={() => toggleCollapse(pane.id)}
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
      <div
        className="pane"
        role={pane.headerless ? 'region' : undefined}
        aria-label={pane.headerless ? pane.title : undefined}
        // flex-shrink 1: סכום ה-basis הוא 100%, והמפרידים (4px כל אחד) נוספים עליו — החלוניות
        // מתכווצות יחסית כדי לפנות להם מקום, אחרת המכל גולש (פס גלילה מיותר/חיתוך החלונית האחרונה).
        style={{ flex: `0 1 ${basis}%`, minWidth: 0, minHeight: 0 }}
      >
        {!pane.headerless && (
          <div className="pane-header">
            <span className="pane-title">{pane.title}</span>
            {!collapsed && pane.headerActions}
            {pane.collapsible && (
              <button
                className="icon-btn mini"
                title={collapsed ? 'הרחב' : 'כווץ'}
                aria-label={collapsed ? 'הרחב' : 'כווץ'}
                onClick={onCollapse}
              >
                <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size="1em" />
              </button>
            )}
          </div>
        )}
        {!collapsed && <div className="pane-body">{pane.content}</div>}
      </div>
      {showResizer && (
        <div
          className={`resizer ${direction}`}
          onPointerDown={onResizerDown}
          onDoubleClick={onResizerDouble}
          role="separator"
          aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
          title="גרור לשינוי גודל · לחיצה כפולה לאיפוס"
        />
      )}
    </>
  );
}
