import { describe, expect, it } from 'vitest';
import { validateData } from '../../src/data/validators';
import { makeExamsManifest, makeQuestionsFile, makeSchedule, makeWeek } from '../helpers/fixtures';
import type { QuestionsFile } from '../../src/data/types';

const errors = (issues: { level: string; message: string }[]) =>
  issues.filter((i) => i.level === 'error').map((i) => i.message);
const warnings = (issues: { level: string; message: string }[]) =>
  issues.filter((i) => i.level === 'warning').map((i) => i.message);

describe('validateData', () => {
  it('נתונים תקינים ללא questionIds — אין שגיאות ואין אזהרות', () => {
    const issues = validateData(makeSchedule(), {}, makeExamsManifest());
    expect(issues).toEqual([]);
  });

  it('מזהה weekId כפול', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks.push(makeWeek({ weekId: 'issue-9999-w1' }));
    expect(errors(validateData(schedule, {}))).toContainEqual(expect.stringContaining('weekId כפול'));
  });

  it('מזהה issueId שאינו ברשימת issueIds של התקופה', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks[0].issueId = 'issue-0000';
    expect(errors(validateData(schedule, {}))).toContainEqual(
      expect.stringContaining('אינו ברשימת issueIds'),
    );
  });

  it('שבוע עם questionIds ללא קובץ שאלות — אזהרה', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks[0].questionIds = ['q1'];
    expect(warnings(validateData(schedule, {}))).toContainEqual(
      expect.stringContaining('אין קובץ שאלות לגליון'),
    );
  });

  it('קובץ שאלות ללא השבוע המתאים — אזהרה', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks[0].questionIds = ['q1'];
    const file = makeQuestionsFile({ weeks: [] });
    expect(warnings(validateData(schedule, { 'issue-9999': file }))).toContainEqual(
      expect.stringContaining('לא נמצא שבוע תואם'),
    );
  });

  it('questionId שקיים ב-schedule וחסר בקובץ — שגיאה', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks[0].questionIds = ['q1', 'q404'];
    schedule.periods[0].weeks[0].totalQuestionsCount = 2;
    const issues = validateData(schedule, { 'issue-9999': makeQuestionsFile() });
    expect(errors(issues)).toContainEqual(expect.stringContaining('questionId q404'));
  });

  it('totalQuestionsCount שאינו תואם למספר השאלות בקובץ — אזהרה', () => {
    const schedule = makeSchedule();
    schedule.periods[0].weeks[0].questionIds = ['q1'];
    schedule.periods[0].weeks[0].totalQuestionsCount = 7;
    expect(warnings(validateData(schedule, { 'issue-9999': makeQuestionsFile() }))).toContainEqual(
      expect.stringContaining('totalQuestionsCount=7'),
    );
  });

  it('requiredAnswersCount גדול מ-totalQuestionsCount — שגיאה', () => {
    const schedule = makeSchedule();
    Object.assign(schedule.periods[0].weeks[0], {
      questionIds: ['q1', 'q2'],
      totalQuestionsCount: 2,
      requiredAnswersCount: 3,
    });
    expect(errors(validateData(schedule, { 'issue-9999': makeQuestionsFile() }))).toContainEqual(
      expect.stringContaining('requiredAnswersCount גדול'),
    );
  });

  it('questionId כפול בתוך קובץ שאלות — שגיאה', () => {
    const file: QuestionsFile = makeQuestionsFile();
    file.weeks[0].questions.push({ ...file.weeks[0].questions[0] });
    expect(errors(validateData(makeSchedule(), { 'issue-9999': file }))).toContainEqual(
      expect.stringContaining('questionId כפול q1'),
    );
  });

  it('שאלה בלי כותרת — אזהרה', () => {
    const file = makeQuestionsFile();
    file.weeks[0].questions[0].title = '   ';
    expect(warnings(validateData(makeSchedule(), { 'issue-9999': file }))).toContainEqual(
      expect.stringContaining('אין כותרת'),
    );
  });

  it('גליון שמופנה ב-schedule וחסר ב-exams-manifest — אזהרה', () => {
    const manifest = makeExamsManifest({ exams: [] });
    expect(warnings(validateData(makeSchedule(), {}, manifest))).toContainEqual(
      expect.stringContaining('חסר ב-exams-manifest'),
    );
  });

  it('ללא exams-manifest — אין בדיקת גליונות', () => {
    expect(validateData(makeSchedule(), {})).toEqual([]);
  });
});

describe('validateData — נתוני הפרודקשן', () => {
  it('schedule/questions/manifest האמיתיים עוברים ולידציה בלי שגיאות', async () => {
    const schedule = (await import('../../public/data/schedule.json')).default;
    const manifest = (await import('../../public/data/exams-manifest.json')).default;
    const issue0240 = (await import('../../public/data/questions/issue-0240.json')).default;
    const issues = validateData(
      schedule as never,
      { 'issue-0240': issue0240 as never },
      manifest as never,
    );
    expect(errors(issues)).toEqual([]);
  });
});
