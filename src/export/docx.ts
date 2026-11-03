// ייצוא תשובות ל-DOCX והורדה למשתמש.

import { htmlToOoxml, packageDocx } from './ooxml';
import {
  buildWeekAnswersHtml,
  buildIssueAnswersHtml,
  hasWrittenAnswer,
  type ExportWeekInput,
} from './answerHtml';
import { saveBlobAs, downloadBlob, type SaveOutcome } from './saveFile';
import type { ScheduleWeek, SettingsState } from '../data/types';

export function buildAnswersDocx(html: string): Blob {
  const body = htmlToOoxml(html);
  return packageDocx(body);
}

/** מייצא את תשובות השבוע ושומר קובץ DOCX (דיאלוג שמירה באוצריא). מחזיר את תוצאת השמירה. */
export async function exportWeekDocx(input: ExportWeekInput, issueNumber: number): Promise<SaveOutcome> {
  const html = buildWeekAnswersHtml(input);
  const blob = buildAnswersDocx(html);
  const filename = `תשובות עיון ההלכה - גליון ${issueNumber} - שבוע ${input.week.weekNumber}.docx`;
  return saveBlobAs(blob, filename, 'שמירת תשובות עיון ההלכה');
}

export interface ExportIssueInput {
  weeks: ScheduleWeek[];
  settings: SettingsState;
  issueTitle: string;
  hebrewMonth: string;
  dateLabel: string;
}

/**
 * מייצא את תשובות כל שבועות הגליון לקובץ DOCX אחד ושומר אותו. מחזיר את תוצאת השמירה.
 * נכללים רק שבועות שנכתבה בהם תשובה — קובץ שנשלח באמצע הגליון לא יכיל שבועות ריקים.
 * זורק שגיאה אם אין אף תשובה כתובה בגליון.
 */
export async function exportIssueDocx(input: ExportIssueInput, issueNumber: number): Promise<SaveOutcome> {
  const { weeks, settings, issueTitle, hebrewMonth, dateLabel } = input;
  const answered = weeks.filter((w) => hasWrittenAnswer(w.weekId));
  if (answered.length === 0) throw new Error('אין תשובות כתובות בגליון זה');
  const html = buildIssueAnswersHtml(answered, { issueTitle, hebrewMonth, dateLabel, settings });
  const blob = buildAnswersDocx(html);
  const filename = `תשובות עיון ההלכה - גליון ${issueNumber} - כל השבועות.docx`;
  return saveBlobAs(blob, filename, 'שמירת תשובות עיון ההלכה');
}

export { downloadBlob };
export type { SaveOutcome };
export type { ExportWeekInput };
