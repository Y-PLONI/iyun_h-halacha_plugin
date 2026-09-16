// ייצוא תשובות ל-DOCX והורדה למשתמש.

import { htmlToOoxml, packageDocx } from './ooxml';
import { buildWeekAnswersHtml, buildIssueAnswersHtml, type ExportWeekInput } from './answerHtml';
import type { ScheduleWeek, SettingsState } from '../data/types';

export function buildAnswersDocx(html: string): Blob {
  const body = htmlToOoxml(html);
  return packageDocx(body);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** מייצא את תשובות השבוע ומוריד קובץ DOCX. מחזיר את שם הקובץ. */
export function exportWeekDocx(input: ExportWeekInput, issueNumber: number): string {
  const html = buildWeekAnswersHtml(input);
  const blob = buildAnswersDocx(html);
  const filename = `תשובות עיון ההלכה - גליון ${issueNumber} - שבוע ${input.week.weekNumber}.docx`;
  downloadBlob(blob, filename);
  return filename;
}

export interface ExportIssueInput {
  weeks: ScheduleWeek[];
  settings: SettingsState;
  issueTitle: string;
  hebrewMonth: string;
  dateLabel: string;
}

/** מייצא את תשובות כל שבועות הגליון לקובץ DOCX אחד ומוריד אותו. מחזיר את שם הקובץ. */
export function exportIssueDocx(input: ExportIssueInput, issueNumber: number): string {
  const { weeks, settings, issueTitle, hebrewMonth, dateLabel } = input;
  const html = buildIssueAnswersHtml(weeks, { issueTitle, hebrewMonth, dateLabel, settings });
  const blob = buildAnswersDocx(html);
  const filename = `תשובות עיון ההלכה - גליון ${issueNumber} - כל השבועות.docx`;
  downloadBlob(blob, filename);
  return filename;
}

export type { ExportWeekInput };
