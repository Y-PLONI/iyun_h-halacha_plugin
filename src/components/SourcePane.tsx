import { useEffect, useState } from 'react';
import type { ScheduleWeek, SourceRef, SourceRole } from '../data/types';
import { SOURCE_ROLE_LABELS } from '../data/types';
import { loadSourceRange, openInOtzaria, type LoadedSource } from '../otzaria/library';
import { useSettings } from '../state/settingsStore';
import { setSettingsOpen } from '../state/appStore';
import { toast } from './Toast';
import { Icon } from './Icon';
import { sanitizeSourceHtml } from '../utils/html';
import { SplitPane, type PaneDef } from './SplitPane';

// cache בזיכרון לפי bookId:startRef:endRef
const cache = new Map<string, LoadedSource>();

interface SourcePaneProps {
  week: ScheduleWeek;
}

// סדר התצוגה והגדלים היחסיים (מ"ב עיקרי).
// הערה: 'shaarHatziyun' (שער הציון) הושמט כרגע — הספר אינו קיים במאגר הספרים.
// כשיתווסף, מוסיפים שורה: { role: 'shaarHatziyun', defaultSize: 14 } והגדלים יתאזנו.
const DISPLAY_ROLES: { role: SourceRole; defaultSize: number }[] = [
  { role: 'shulchanAruch', defaultSize: 24 },
  { role: 'mishnaBerurah', defaultSize: 48 },
  { role: 'biurHalacha', defaultSize: 28 },
];

export function SourcePane({ week }: SourcePaneProps) {
  const settings = useSettings();
  // מפתח רענון לכל תפקיד — כפתור הרענון בכותרת מגדיל אותו והתוכן נטען מחדש
  const [reloadKeys, setReloadKeys] = useState<Partial<Record<SourceRole, number>>>({});
  const bumpReload = (role: SourceRole, cacheKey: string) => {
    cache.delete(cacheKey);
    setReloadKeys((k) => ({ ...k, [role]: (k[role] ?? 0) + 1 }));
  };

  const panes: PaneDef[] = [];
  for (const { role, defaultSize } of DISPLAY_ROLES) {
    const ref = week.sourceRefs[role];
    if (!ref) continue;
    const bookId = settings.bookIds[role] || ref.bookId || '';
    const refLabel =
      ref.endRef && ref.endRef !== ref.startRef ? `${ref.startRef} – ${ref.endRef}` : ref.startRef;
    const cacheKey = `${bookId}:${ref.startRef}:${ref.endRef ?? ''}`;

    const handleOpen = async () => {
      if (!bookId) {
        setSettingsOpen(true);
        return;
      }
      const okOpen = await openInOtzaria(bookId, ref.startRef);
      if (!okOpen) toast('לא ניתן לפתוח את הספר באוצריא');
    };

    panes.push({
      id: role,
      title: `${SOURCE_ROLE_LABELS[role]} · ${refLabel}`,
      minSize: 8,
      defaultSize,
      collapsible: true,
      headerActions: (
        <>
          <button
            className="icon-btn mini"
            title="רענן"
            onClick={() => bumpReload(role, cacheKey)}
          >
            <Icon name="sync" size="1em" />
          </button>
          <button className="icon-btn mini" title="פתח באוצריא" onClick={() => void handleOpen()}>
            <Icon name="open" size="1em" />
          </button>
        </>
      ),
      content: (
        <SourceContent bookId={bookId} sourceRef={ref} cacheKey={cacheKey} reloadKey={reloadKeys[role] ?? 0} />
      ),
    });
  }

  if (!panes.length) {
    return <div className="source-empty">אין מקורות מוגדרים לשבוע זה.</div>;
  }

  return <SplitPane direction="vertical" panes={panes} storageKey="sources-v1" />;
}

function SourceContent({
  bookId,
  sourceRef,
  cacheKey,
  reloadKey,
}: {
  bookId: string;
  sourceRef: SourceRef;
  cacheKey: string;
  reloadKey: number;
}) {
  const [state, setState] = useState<LoadedSource | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookId) {
      setState({ ok: false, text: '', error: 'לא הוגדר ספר. הגדר את שם הספר בהגדרות.' });
      return;
    }
    const cached = cache.get(cacheKey);
    if (cached && reloadKey === 0) {
      setState(cached);
      return;
    }
    let alive = true;
    setLoading(true);
    void (async () => {
      const res = await loadSourceRange(bookId, sourceRef.startRef, sourceRef.endRef);
      if (!alive) return;
      cache.set(cacheKey, res);
      setState(res);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, reloadKey, bookId]);

  return (
    <div className={`source-sub-body${loading ? ' loading' : state && !state.ok ? ' error' : ''}`}>
      {loading && <span className="spinner sm" style={{ display: 'inline-block', verticalAlign: 'middle' }} />}
      {loading && <span style={{ marginInlineStart: 8 }}>טוען מקור…</span>}
      {!loading && state?.ok && (
        <div className="source-html" dangerouslySetInnerHTML={{ __html: sanitizeSourceHtml(state.text) }} />
      )}
      {!loading && state && !state.ok && (
        <>
          {state.error}
          <div style={{ marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => setSettingsOpen(true)}>
              הגדר ספר
            </button>
          </div>
        </>
      )}
    </div>
  );
}
