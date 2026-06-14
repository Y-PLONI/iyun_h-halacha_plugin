import { useEffect, useState } from 'react';
import type { ScheduleWeek, SourceRef, SourceRole } from '../data/types';
import { SOURCE_ROLE_LABELS } from '../data/types';
import { loadSourceRange, openInOtzaria, type LoadedSource } from '../otzaria/library';
import { useSettings } from '../state/settingsStore';
import { setSettingsOpen } from '../state/appStore';
import { toast } from './Toast';
import { Icon } from './Icon';

// cache בזיכרון לפי bookId:startRef:endRef
const cache = new Map<string, LoadedSource>();

interface SourcePaneProps {
  week: ScheduleWeek;
}

// סדר התצוגה והגדלים היחסיים (מ"ב עיקרי)
const DISPLAY_ROLES: { role: SourceRole; basis: number }[] = [
  { role: 'shulchanAruch', basis: 22 },
  { role: 'mishnaBerurah', basis: 46 },
  { role: 'biurHalacha', basis: 20 },
  { role: 'shaarHatziyun', basis: 12 },
];

export function SourcePane({ week }: SourcePaneProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {DISPLAY_ROLES.map(({ role, basis }) => {
        const ref = week.sourceRefs[role];
        if (!ref) return null;
        return <SourceSubPane key={role} role={role} sourceRef={ref} basis={basis} />;
      })}
    </div>
  );
}

function SourceSubPane({ role, sourceRef, basis }: { role: SourceRole; sourceRef: SourceRef; basis: number }) {
  const settings = useSettings();
  const bookId = settings.bookIds[role] || sourceRef.bookId || '';
  const [collapsed, setCollapsed] = useState(false);
  const [state, setState] = useState<LoadedSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const cacheKey = `${bookId}:${sourceRef.startRef}:${sourceRef.endRef ?? ''}`;

  useEffect(() => {
    if (collapsed) return;
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
  }, [cacheKey, collapsed, reloadKey, bookId]);

  const refLabel = sourceRef.endRef && sourceRef.endRef !== sourceRef.startRef
    ? `${sourceRef.startRef} – ${sourceRef.endRef}`
    : sourceRef.startRef;

  const handleOpen = async () => {
    if (!bookId) {
      setSettingsOpen(true);
      return;
    }
    const ok = await openInOtzaria(bookId, sourceRef.startRef);
    if (!ok) toast('לא ניתן לפתוח את הספר באוצריא');
  };

  const handleRefresh = () => {
    cache.delete(cacheKey);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="source-sub" style={{ flex: collapsed ? '0 0 auto' : `1 1 ${basis}%`, minHeight: collapsed ? 'auto' : 60 }}>
      <div className="source-sub-head" onClick={() => setCollapsed((c) => !c)}>
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size="1em" />
        <span style={{ flex: 1 }}>
          {SOURCE_ROLE_LABELS[role]} · {refLabel}
        </span>
        <button
          className="icon-btn mini"
          title="רענן"
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
        >
          <Icon name="sync" size="1em" />
        </button>
        <button
          className="icon-btn mini"
          title="פתח באוצריא"
          onClick={(e) => {
            e.stopPropagation();
            void handleOpen();
          }}
        >
          <Icon name="open" size="1em" />
        </button>
      </div>
      {!collapsed && (
        <div className={`source-sub-body${loading ? ' loading' : state && !state.ok ? ' error' : ''}`} style={{ flex: 1 }}>
          {loading && <span className="spinner sm" style={{ display: 'inline-block', verticalAlign: 'middle' }} />}
          {loading && <span style={{ marginInlineStart: 8 }}>טוען מקור…</span>}
          {!loading && state?.ok && state.text}
          {!loading && state && !state.ok && (
            <>
              {state.error}
              {!bookId && (
                <div style={{ marginTop: 8 }}>
                  <button className="btn-secondary" onClick={() => setSettingsOpen(true)}>
                    הגדר ספר
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
