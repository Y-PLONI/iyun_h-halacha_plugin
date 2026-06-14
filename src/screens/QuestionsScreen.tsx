import { getAllWeeks, getWeek } from '../data/localData';
import { useApp, openWorkspace, selectWeek } from '../state/appStore';
import { ExamView } from '../components/ExamView';
import { EmptyState } from '../components/EmptyState';
import { openInOtzaria } from '../otzaria/library';
import { useSettings } from '../state/settingsStore';
import { toast } from '../components/Toast';

export function QuestionsScreen() {
  const app = useApp();
  const settings = useSettings();
  const weeks = getAllWeeks();
  const week = app.activeWeekId ? getWeek(app.activeWeekId) : null;

  const openSourceInOtzaria = async () => {
    if (!week) return;
    const mb = week.sourceRefs.mishnaBerurah;
    const bookId = settings.bookIds.mishnaBerurah || mb?.bookId;
    if (!mb || !bookId) {
      toast('לא הוגדר ספר משנה ברורה');
      return;
    }
    const ok = await openInOtzaria(bookId, mb.startRef);
    if (!ok) toast('לא ניתן לפתוח את הספר באוצריא');
  };

  return (
    <div className="screen-pad">
      <div className="toolbar-row">
        <label className="text-label">שבוע:</label>
        <select className="input select-inline" value={week?.weekId ?? ''} onChange={(e) => selectWeek(e.target.value)}>
          {weeks.map((w) => (
            <option key={w.weekId} value={w.weekId}>
              שבוע {w.weekNumber} · פרשת {w.parasha}
            </option>
          ))}
        </select>
        <span className="spacer" />
        {week && (
          <>
            <button className="btn-secondary" onClick={() => void openSourceInOtzaria()}>
              ↗ פתח מקור באוצריא
            </button>
            <button className="btn-primary" onClick={() => openWorkspace(week.weekId)}>
              עבור לכתיבה
            </button>
          </>
        )}
      </div>

      {!week ? (
        <EmptyState icon="📋" title="בחר שבוע להצגת המבחן" />
      ) : (
        <div className="card exam-card">
          <ExamView week={week} />
        </div>
      )}
    </div>
  );
}
