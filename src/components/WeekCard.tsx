import type { ScheduleWeek } from '../data/types';
import { computeWeekProgress, useAnswersState } from '../state/answersStore';
import { getQuestionsForWeek } from '../data/localData';
import { openQuestionsScreen, openWorkspace } from '../state/appStore';
import { StatusBadge } from './StatusBadge';

export function WeekCard({ week }: { week: ScheduleWeek }) {
  // נרשמים לשינויי תשובות כדי לעדכן את ההתקדמות
  useAnswersState();
  const questions = getQuestionsForWeek(week);
  const progress = computeWeekProgress(week, questions.length);

  return (
    <div className="week-card">
      <div className="wk-head">
        <span className="wk-num">שבוע {week.weekNumber}/{week.weeksInIssue}</span>
        <h3>פרשת {week.parasha}</h3>
      </div>
      <div className="wk-range">{week.sourceRangeTitle}</div>
      {week.topicTitle && <div className="wk-topic">{week.topicTitle}</div>}
      <StatusBadge progress={progress} />
      <div className="wk-actions">
        <button className="icon-btn" onClick={() => openQuestionsScreen(week.weekId)}>
          שאלות
        </button>
        <button className="icon-btn primary" onClick={() => openWorkspace(week.weekId)}>
          כתיבה
        </button>
      </div>
    </div>
  );
}
