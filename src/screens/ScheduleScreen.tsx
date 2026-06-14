import { useMemo, useState } from 'react';
import { schedule, getExamWeek } from '../data/localData';
import { computeWeekProgress, useAnswersState } from '../state/answersStore';
import { WeekCard } from '../components/WeekCard';
import { EmptyState } from '../components/EmptyState';

type StatusFilter = 'all' | 'not-started' | 'draft' | 'completed';

export function ScheduleScreen() {
  // נרשמים לשינויי תשובות כדי שחישוב ההתקדמות יתעדכן בכל שמירה
  const answersState = useAnswersState();
  const [parashaFilter, setParashaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const period = schedule.periods[0];
  const weeks = period?.weeks ?? [];

  // התקדמות כוללת לפי שבועות — תלוי גם ב-answersState כדי להתעדכן בעת שמירה
  const totals = useMemo(() => {
    let completed = 0;
    for (const w of weeks) {
      if (computeWeekProgress(w, !!getExamWeek(w)).status === 'completed') completed++;
    }
    return { total: weeks.length, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, answersState]);

  const filtered = weeks.filter((w) => {
    if (parashaFilter !== 'all' && w.parasha !== parashaFilter) return false;
    if (statusFilter !== 'all') {
      const p = computeWeekProgress(w, !!getExamWeek(w));
      if (statusFilter !== p.status) return false;
    }
    return true;
  });

  if (!period) {
    return (
      <div className="screen-pad">
        <EmptyState icon="📭" title="לא נמצאו נתוני הספק" />
      </div>
    );
  }

  const pct = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  return (
    <div className="screen-pad">
      <div className="issue-card">
        <h2>גליון ר"מ · {period.title}</h2>
        <div className="issue-meta">
          <span>{weeks.length} שבועות</span>
          <span>
            הושלמו {totals.completed} מתוך {totals.total} שבועות
          </span>
        </div>
        <div className="progress-bar" title={`${pct}%`}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="filter-chips">
        <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>הכל</Chip>
        <Chip active={statusFilter === 'not-started'} onClick={() => setStatusFilter('not-started')}>טרם התחיל</Chip>
        <Chip active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')}>טיוטה</Chip>
        <Chip active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>הושלם</Chip>
        <span style={{ width: 12 }} />
        <Chip active={parashaFilter === 'all'} onClick={() => setParashaFilter('all')}>כל הפרשות</Chip>
        {weeks.map((w) => (
          <Chip key={w.weekId} active={parashaFilter === w.parasha} onClick={() => setParashaFilter(w.parasha)}>
            {w.parasha}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="אין שבועות התואמים את הסינון" />
      ) : (
        <div className="weeks-grid">
          {filtered.map((w) => (
            <WeekCard key={w.weekId} week={w} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`chip${active ? ' active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
