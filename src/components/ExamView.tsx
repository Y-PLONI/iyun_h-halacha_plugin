import type { ScheduleWeek } from '../data/types';
import { getExamWeek } from '../data/localData';
import { EmptyState } from './EmptyState';

/** תצוגת המבחן (Word→HTML) לשבוע נתון — קריאה בלבד. */
export function ExamView({ week }: { week: ScheduleWeek }) {
  const exam = getExamWeek(week);
  if (!exam) {
    return <EmptyState icon="document" title="מסמך המבחן אינו זמין לשבוע זה" />;
  }
  return (
    <div className="exam-doc">
      <div className="exam-doc-head">
        <span className="exam-week-pill">שבוע {week.weekNumber}/{week.weeksInIssue}</span>
        <h3>{exam.headerText || `פרשת ${week.parasha}`}</h3>
      </div>
      {exam.sourceRangeTitle && <p className="exam-range">{exam.sourceRangeTitle}</p>}
      <div className="exam-doc-body" dangerouslySetInnerHTML={{ __html: exam.html }} />
    </div>
  );
}
