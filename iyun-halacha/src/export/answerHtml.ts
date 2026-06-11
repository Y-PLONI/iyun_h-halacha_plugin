// בניית מסמך HTML של התשובות, שישמש כמקור להמרה ל-OOXML.

import type { Question, ScheduleWeek, SettingsState } from '../data/types';
import { getAnswer } from '../state/answersStore';

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface ExportWeekInput {
  week: ScheduleWeek;
  questions: Question[];
  settings: SettingsState;
  issueTitle: string;
  hebrewMonth: string;
  dateLabel: string;
  /** האם לכלול את נוסח השאלה (אם אין רשות — false, יוצג "שאלה N" בלבד) */
  includeQuestionText: boolean;
}

export function buildWeekAnswersHtml(input: ExportWeekInput): string {
  const { week, questions, settings, issueTitle, hebrewMonth, dateLabel, includeQuestionText } = input;
  const parts: string[] = [];

  parts.push(`<h1>תשובות לעיון ההלכה - ${esc(issueTitle)}</h1>`);
  parts.push(`<p>${esc(hebrewMonth)}</p>`);
  if (settings.name) parts.push(`<p>שם: ${esc(settings.name)}</p>`);
  if (settings.personalCode) parts.push(`<p>קוד אישי: ${esc(settings.personalCode)}</p>`);
  parts.push(`<p>תאריך יצירה: ${esc(dateLabel)}</p>`);

  parts.push(`<h2>שבוע ${week.weekNumber} - פרשת ${esc(week.parasha)}</h2>`);
  parts.push(`<p>${esc(week.sourceRangeTitle)}</p>`);

  let order = 0;
  for (const q of questions) {
    order++;
    const rec = getAnswer(week.issueId, q.questionId);
    const heading = includeQuestionText
      ? `שאלה ${esc(q.letter)}: ${esc(q.title)}`
      : `שאלה ${order}`;
    parts.push(`<h3>${heading}</h3>`);
    if (includeQuestionText && q.body) {
      parts.push(`<p><em>${esc(q.body)}</em></p>`);
    }
    parts.push(`<p>תשובה:</p>`);
    if (rec?.answerHtml && rec.answerText.trim()) {
      parts.push(rec.answerHtml);
    } else {
      parts.push('<p>—</p>');
    }
  }

  return parts.join('\n');
}

/** מודל גליון מלא — שבוע אחר שבוע. */
export function buildIssueAnswersHtml(
  weeksInput: Omit<ExportWeekInput, 'issueTitle' | 'hebrewMonth' | 'dateLabel'>[],
  meta: { issueTitle: string; hebrewMonth: string; dateLabel: string; settings: SettingsState },
): string {
  const head: string[] = [];
  head.push(`<h1>תשובות לעיון ההלכה - ${esc(meta.issueTitle)}</h1>`);
  head.push(`<p>${esc(meta.hebrewMonth)}</p>`);
  if (meta.settings.name) head.push(`<p>שם: ${esc(meta.settings.name)}</p>`);
  if (meta.settings.personalCode) head.push(`<p>קוד אישי: ${esc(meta.settings.personalCode)}</p>`);
  head.push(`<p>תאריך יצירה: ${esc(meta.dateLabel)}</p>`);

  const body = weeksInput.map((w) => {
    const sub: string[] = [];
    sub.push(`<h2>שבוע ${w.week.weekNumber} - פרשת ${esc(w.week.parasha)}</h2>`);
    sub.push(`<p>${esc(w.week.sourceRangeTitle)}</p>`);
    let order = 0;
    for (const q of w.questions) {
      order++;
      const rec = getAnswer(w.week.issueId, q.questionId);
      const heading = w.includeQuestionText ? `שאלה ${esc(q.letter)}: ${esc(q.title)}` : `שאלה ${order}`;
      sub.push(`<h3>${heading}</h3>`);
      if (w.includeQuestionText && q.body) sub.push(`<p><em>${esc(q.body)}</em></p>`);
      sub.push(`<p>תשובה:</p>`);
      sub.push(rec?.answerText.trim() ? rec.answerHtml : '<p>—</p>');
    }
    return sub.join('\n');
  });

  return [...head, ...body].join('\n');
}
