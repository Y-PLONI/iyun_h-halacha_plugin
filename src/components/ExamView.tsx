import type { ScheduleWeek } from '../data/types';
import { getExamWeek } from '../data/localData';
import { EmptyState } from './EmptyState';

/** תצוגת המבחן (Word→HTML) לשבוע נתון — קריאה בלבד. */
export function ExamView({ week }: { week: ScheduleWeek }) {
  const exam = getExamWeek(week);
  if (!exam) {
    return <EmptyState icon="📄" title="מסמך המבחן אינו זמין לשבוע זה" />;
  }
  return (
    <div className="exam-doc">
      <div className="exam-doc-head">
        <span className="exam-week-pill">שבוע {week.weekNumber}/{week.weeksInIssue}</span>
        <h3>פרשת {exam.parasha}{exam.title ? ` · ${exam.title}` : ''}</h3>
      </div>
      <div className="exam-doc-body" dangerouslySetInnerHTML={{ __html: exam.html }} />
    </div>
  );
}
