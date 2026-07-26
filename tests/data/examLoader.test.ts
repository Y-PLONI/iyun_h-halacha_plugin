// טעינת מסמכי המבחן האמיתיים מ-exams-src/*.docx (mammoth) ופיצולם לשבועות.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { getExamDoc, getExamWeek, loadExams } from '../../src/data/examLoader';
import { examsManifest, getAllWeeks, getWeeksForIssue } from '../../src/data/localData';
import { makeWeek } from '../helpers/fixtures';

beforeAll(async () => {
  await loadExams();
});

describe('loadExams — המרת ה-docx בזמן ריצה', () => {
  it('טוען מסמך לכל גליון שמופיע ב-manifest', () => {
    for (const exam of examsManifest.exams) {
      expect(getExamDoc(exam.issueId), exam.issueId).not.toBeNull();
    }
  });

  it('מחזיר null לגליון שאין לו מסמך', () => {
    expect(getExamDoc('issue-0000')).toBeNull();
  });

  it('קריאה חוזרת ל-loadExams אינה טוענת מחדש', async () => {
    const before = getExamDoc('issue-0240');
    await loadExams();
    expect(getExamDoc('issue-0240')).toBe(before);
  });

  it('מספר השבועות במסמך תואם ל-schedule ול-manifest', () => {
    for (const exam of examsManifest.exams) {
      const doc = getExamDoc(exam.issueId)!;
      expect(doc.weeks.length, exam.issueId).toBe(exam.weeksInIssue);
      expect(doc.weeks.map((w) => w.weekNumber).sort((a, b) => a - b)).toEqual(
        getWeeksForIssue(exam.issueId).map((w) => w.weekNumber),
      );
    }
  });

  it('כל מסמך כולל כותרת גליון ושם קובץ מקור', () => {
    for (const exam of examsManifest.exams) {
      const doc = getExamDoc(exam.issueId)!;
      expect(doc.issueTitle).toContain('גליון');
      expect(doc.sourceFile).toBe(`${exam.issueId}.docx`);
      expect(doc.hebrewMonth).toBeTruthy();
    }
  });

  it('לכל שבוע במסמך יש שאלות (exam-q) וכותרת', () => {
    for (const exam of examsManifest.exams) {
      for (const week of getExamDoc(exam.issueId)!.weeks) {
        const label = `${exam.issueId}-w${week.weekNumber}`;
        expect(week.headerText, label).toBeTruthy();
        expect(week.html, label).toContain('class="exam-q"');
      }
    }
  });

  it('ה-HTML של המבחן אינו כולל תגיות סקריפט או תגיות לא מוכרות', () => {
    for (const exam of examsManifest.exams) {
      for (const week of getExamDoc(exam.issueId)!.weeks) {
        expect(week.html).not.toMatch(/<script/i);
        const tags = [...week.html.matchAll(/<(\/?)([a-z]+)/g)].map((m) => m[2]);
        expect(new Set(tags)).toEqual(new Set(['p', 'span']));
      }
    }
  });
});

describe('getExamWeek', () => {
  it('מאתר את מסמך השבוע לפי weekNumber', () => {
    const week = getWeeksForIssue('issue-0240')[1];
    expect(getExamWeek(week)?.weekNumber).toBe(week.weekNumber);
  });

  it('לכל שבוע ב-schedule יש מסמך מבחן תואם', () => {
    for (const week of getAllWeeks()) {
      expect(getExamWeek(week), week.weekId).not.toBeNull();
    }
  });

  it('מחזיר null לשבוע של גליון שאינו קיים', () => {
    expect(getExamWeek(makeWeek())).toBeNull();
  });

  it('מחזיר null ל-weekNumber שאינו במסמך', () => {
    expect(getExamWeek(makeWeek({ issueId: 'issue-0240', weekNumber: 99 }))).toBeNull();
  });
});

describe('loadExams — עמידות לשגיאות המרה', () => {
  it('כשל בהמרת מסמך אינו מפיל את הטעינה', async () => {
    vi.resetModules();
    vi.doMock('mammoth/mammoth.browser.min.js', () => ({
      default: { convertToHtml: vi.fn().mockRejectedValue(new Error('boom')) },
    }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fresh = await import('../../src/data/examLoader');
    await expect(fresh.loadExams()).resolves.toBeUndefined();
    expect(fresh.getExamDoc('issue-0240')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    vi.doUnmock('mammoth/mammoth.browser.min.js');
    vi.resetModules();
  });
});
