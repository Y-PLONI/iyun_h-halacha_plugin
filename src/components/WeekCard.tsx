import type { ScheduleWeek } from '../data/types';
import { computeWeekProgress, useAnswersState } from '../state/answersStore';
import { getExamWeek } from '../data/localData';
import { openQuestionsScreen, openWorkspace } from '../state/appStore';
import { StatusBadge } from './StatusBadge';

export function WeekCard({ week }: { week: ScheduleWeek }) {
  // נרשמים לשינויי תשובות כדי לעדכן את ההתקדמות
  useAnswersState();
  const hasExam = !!getExamWeek(week);
  const progress = computeWeekProgress(week, hasExam);

  return (
    <div className="week-card" onClick={() => openWorkspace(week.weekId)}>
      <div className="wk-head">
        <span className="wk-num">שבוע {week.weekNumber}/{week.weeksInIssue}</span>
        <StatusBadge progress={progress} />
      </div>
      <h3>פרשת {week.parasha}</h3>
      <div className="wk-range">{week.sourceRangeTitle}</div>
      {week.topicTitle && <div className="wk-topic">{week.topicTitle}</div>}
      <div className="wk-actions">
        <button
          className="btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            openQuestionsScreen(week.weekId);
          }}
        >
          מבחן
        </button>
        <button
          className="btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            openWorkspace(week.weekId);
          }}
        >
          כתיבה
        </button>
      </div>
    </div>
  );
}
