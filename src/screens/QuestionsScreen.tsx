import { getAllWeeks, getQuestionsForWeek, getWeek } from '../data/localData';
import { useApp, openWorkspace, selectWeek } from '../state/appStore';
import { QuestionList } from '../components/QuestionList';
import { EmptyState } from '../components/EmptyState';
import { openInOtzaria } from '../otzaria/library';
import { useSettings } from '../state/settingsStore';
import { toast } from '../components/Toast';

export function QuestionsScreen() {
  const app = useApp();
  const settings = useSettings();
  const weeks = getAllWeeks();
  const week = app.activeWeekId ? getWeek(app.activeWeekId) : null;
  const questions = week ? getQuestionsForWeek(week) : [];

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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem' }}>שבוע:</label>
        <select
          className="issue-select"
          value={week?.weekId ?? ''}
          onChange={(e) => selectWeek(e.target.value)}
        >
          {weeks.map((w) => (
            <option key={w.weekId} value={w.weekId}>
              שבוע {w.weekNumber} · פרשת {w.parasha}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        {week && questions.length > 0 && (
          <>
            <button className="icon-btn" onClick={() => void openSourceInOtzaria()}>
              ↗ פתח מקור באוצריא
            </button>
            <button className="icon-btn primary" onClick={() => openWorkspace(week.weekId)}>
              עבור לכתיבה
            </button>
          </>
        )}
      </div>

      {!week ? (
        <EmptyState icon="📋" title="בחר שבוע להצגת השאלות" />
      ) : questions.length === 0 ? (
        <EmptyState icon="📭" title="קובץ שאלות מובנה לא זמין לגליון זה">
          <p style={{ fontSize: '0.85rem' }}>ניתן לעדכן נתונים או לספק קובץ שאלות לגליון.</p>
        </EmptyState>
      ) : (
        <>
          <div className="banner">
            פרשת {week.parasha} · {week.title} · {week.sourceRangeTitle}
          </div>
          <QuestionList
            week={week}
            questions={questions}
            selectedId={null}
            onSelect={(qid) => openWorkspace(week.weekId, qid)}
            showBody
            search
          />
        </>
      )}
    </div>
  );
}
