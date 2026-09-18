// בניית מסמך HTML של התשובות, שישמש כמקור להמרה ל-OOXML.
// מודל: תשובה חופשית אחת לכל שבוע.

import type { ScheduleWeek, SettingsState } from '../data/types';
import { getAnswer } from '../state/answersStore';

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface ExportWeekInput {
  week: ScheduleWeek;
  settings: SettingsState;
  issueTitle: string;
  hebrewMonth: string;
  dateLabel: string;
}

function header(settings: SettingsState, issueTitle: string, hebrewMonth: string, dateLabel: string): string[] {
  const out: string[] = [];
  out.push(`<h1>תשובות לעיון ההלכה - ${esc(issueTitle)}</h1>`);
  if (hebrewMonth) out.push(`<p>${esc(hebrewMonth)}</p>`);
  if (settings.name) out.push(`<p>שם: ${esc(settings.name)}</p>`);
  if (settings.personalCode) out.push(`<p>קוד אישי: ${esc(settings.personalCode)}</p>`);
  out.push(`<p>תאריך יצירה: ${esc(dateLabel)}</p>`);
  return out;
}

/** האם נכתבה תשובה של ממש לשבוע (ולא רשומה ריקה). */
export function hasWrittenAnswer(weekId: string): boolean {
  const rec = getAnswer(weekId);
  return Boolean(rec?.answerHtml && rec.answerText.trim());
}

function weekBlock(week: ScheduleWeek): string[] {
  const out: string[] = [];
  out.push(`<h2>שבוע ${week.weekNumber} - פרשת ${esc(week.parasha)}</h2>`);
  out.push(`<p>${esc(week.sourceRangeTitle)}</p>`);
  out.push(hasWrittenAnswer(week.weekId) ? getAnswer(week.weekId)!.answerHtml : '<p>—</p>');
  return out;
}

/** ייצוא תשובות שבוע בודד. */
export function buildWeekAnswersHtml(input: ExportWeekInput): string {
  const { week, settings, issueTitle, hebrewMonth, dateLabel } = input;
  return [...header(settings, issueTitle, hebrewMonth, dateLabel), ...weekBlock(week)].join('\n');
}

/** ייצוא גליון שלם — שבוע אחר שבוע. */
export function buildIssueAnswersHtml(
  weeks: ScheduleWeek[],
  meta: { issueTitle: string; hebrewMonth: string; dateLabel: string; settings: SettingsState },
): string {
  const head = header(meta.settings, meta.issueTitle, meta.hebrewMonth, meta.dateLabel);
  const body = weeks.flatMap((w) => weekBlock(w));
  return [...head, ...body].join('\n');
}
