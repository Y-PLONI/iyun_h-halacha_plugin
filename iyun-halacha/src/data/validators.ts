// ולידציה של עקביות הנתונים. משמש גם ב-scripts/validate-data.ts וגם בזמן ריצה (אזהרה).

import type { ExamsManifest, QuestionsFile, Schedule } from './types';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

export function validateData(
  schedule: Schedule,
  questionsFiles: Record<string, QuestionsFile>,
  examsManifest?: ExamsManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (m: string) => issues.push({ level: 'error', message: m });
  const warn = (m: string) => issues.push({ level: 'warning', message: m });

  const weekIds = new Set<string>();
  for (const period of schedule.periods) {
    for (const week of period.weeks) {
      // weekId ייחודי
      if (weekIds.has(week.weekId)) err(`weekId כפול: ${week.weekId}`);
      weekIds.add(week.weekId);

      // issueId עקבי
      if (!period.issueIds.includes(week.issueId)) {
        err(`week ${week.weekId}: issueId=${week.issueId} אינו ברשימת issueIds של התקופה ${period.periodId}`);
      }

      const file = questionsFiles[week.issueId];
      if (!file) {
        warn(`week ${week.weekId}: אין קובץ שאלות לגליון ${week.issueId}`);
        continue;
      }
      const qWeek = file.weeks.find((w) => w.weekId === week.weekId);
      if (!qWeek) {
        warn(`week ${week.weekId}: לא נמצא שבוע תואם בקובץ השאלות`);
        continue;
      }
      const fileIds = new Set(qWeek.questions.map((q) => q.questionId));
      // כל questionId שמופיע ב-schedule קיים בקובץ
      for (const qid of week.questionIds) {
        if (!fileIds.has(qid)) {
          err(`week ${week.weekId}: questionId ${qid} מופיע ב-schedule אך חסר בקובץ השאלות`);
        }
      }
      // ספירה תואמת
      if (week.totalQuestionsCount !== qWeek.questions.length) {
        warn(
          `week ${week.weekId}: totalQuestionsCount=${week.totalQuestionsCount} אך בקובץ יש ${qWeek.questions.length} שאלות`,
        );
      }
      if (week.requiredAnswersCount > week.totalQuestionsCount) {
        err(`week ${week.weekId}: requiredAnswersCount גדול מ-totalQuestionsCount`);
      }
    }
  }

  // questionId ייחודי בתוך כל קובץ שאלות
  for (const [issueId, file] of Object.entries(questionsFiles)) {
    const seen = new Set<string>();
    for (const w of file.weeks) {
      for (const q of w.questions) {
        if (seen.has(q.questionId)) err(`קובץ ${issueId}: questionId כפול ${q.questionId}`);
        seen.add(q.questionId);
        if (!q.title?.trim()) warn(`קובץ ${issueId}: לשאלה ${q.questionId} אין כותרת`);
      }
    }
  }

  // exams-manifest: כל גליון שמופנה ב-schedule מופיע ב-manifest
  if (examsManifest) {
    const examIds = new Set(examsManifest.exams.map((e) => e.issueId));
    const referenced = new Set(schedule.periods.flatMap((p) => p.issueIds));
    for (const id of referenced) {
      if (!examIds.has(id)) warn(`גליון ${id} מופנה ב-schedule אך חסר ב-exams-manifest`);
    }
  }

  return issues;
}
