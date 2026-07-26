import { describe, expect, it } from 'vitest';
import {
  examsManifest,
  getAllWeeks,
  getDefaultIssueId,
  getDefaultWeek,
  getDefaultWeekForIssue,
  getExamMeta,
  getIssues,
  getQuestion,
  getQuestionsFile,
  getQuestionsForWeek,
  getWeek,
  getWeeksForIssue,
  hasQuestionsData,
  schedule,
} from '../../src/data/localData';
import { makeWeek } from '../helpers/fixtures';

describe('localData — schedule', () => {
  it('טוען את קובץ ה-schedule המוטמע', () => {
    expect(schedule.schemaVersion).toBe(1);
    expect(schedule.periods.length).toBeGreaterThan(0);
  });

  it('getAllWeeks מחזיר את כל השבועות מכל התקופות', () => {
    const total = schedule.periods.reduce((s, p) => s + p.weeks.length, 0);
    expect(getAllWeeks()).toHaveLength(total);
  });

  it('getWeek מאתר לפי weekId, ומחזיר null למזהה לא קיים', () => {
    expect(getWeek('issue-0240-w1')?.parasha).toBe('שלח לך');
    expect(getWeek('no-such-week')).toBeNull();
  });

  it('getWeeksForIssue מחזיר רק את שבועות הגליון, ממוינים לפי weekNumber', () => {
    const weeks = getWeeksForIssue('issue-0240');
    expect(weeks.every((w) => w.issueId === 'issue-0240')).toBe(true);
    expect(weeks.map((w) => w.weekNumber)).toEqual([...weeks.map((w) => w.weekNumber)].sort((a, b) => a - b));
  });

  it('getWeeksForIssue מחזיר [] לגליון לא קיים', () => {
    expect(getWeeksForIssue('issue-0000')).toEqual([]);
  });

  it('כל weekId ייחודי גלובלית', () => {
    const ids = getAllWeeks().map((w) => w.weekId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('localData — גליונות', () => {
  it('getIssues ממוין לפי מספר גליון יורד', () => {
    const numbers = getIssues().map((e) => e.issueNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  it('getIssues אינו משנה את סדר המקור (עותק)', () => {
    const before = examsManifest.exams.map((e) => e.issueId);
    getIssues();
    expect(examsManifest.exams.map((e) => e.issueId)).toEqual(before);
  });

  it('getExamMeta מאתר גליון, ומחזיר null לגליון לא קיים', () => {
    expect(getExamMeta('issue-0240')?.issueNumber).toBe(240);
    expect(getExamMeta('issue-0000')).toBeNull();
  });

  it('getDefaultIssueId מחזיר את defaultIssueId כשהוא קיים ב-manifest', () => {
    expect(getDefaultIssueId()).toBe(schedule.defaultIssueId);
    expect(getExamMeta(getDefaultIssueId())).not.toBeNull();
  });

  it('כל גליון ב-schedule קיים ב-manifest ולהיפך', () => {
    const scheduleIssues = new Set(schedule.periods.flatMap((p) => p.issueIds));
    const manifestIssues = new Set(examsManifest.exams.map((e) => e.issueId));
    for (const id of scheduleIssues) expect(manifestIssues).toContain(id);
  });

  it('weeksInIssue ב-manifest תואם למספר השבועות ב-schedule', () => {
    for (const exam of examsManifest.exams) {
      expect(getWeeksForIssue(exam.issueId)).toHaveLength(exam.weeksInIssue);
    }
  });

  it('weeksInIssue בכל שבוע תואם למספר השבועות בגליון', () => {
    for (const week of getAllWeeks()) {
      expect(week.weeksInIssue).toBe(getWeeksForIssue(week.issueId).length);
    }
  });
});

describe('localData — שבוע ברירת מחדל', () => {
  it('בוחר את השבוע הפעיל הראשון', () => {
    const week = getDefaultWeekForIssue('issue-0240');
    expect(week?.weekId).toBe('issue-0240-w1');
    expect(week?.status).toBe('active');
  });

  it('כשאין שבוע פעיל — בוחר את הראשון', () => {
    const week = getDefaultWeekForIssue('issue-0239');
    expect(week?.weekId).toBe('issue-0239-w1');
  });

  it('מחזיר null לגליון בלי שבועות', () => {
    expect(getDefaultWeekForIssue('issue-0000')).toBeNull();
  });

  it('getDefaultWeek מבוסס על גליון ברירת המחדל', () => {
    expect(getDefaultWeek()?.issueId).toBe(getDefaultIssueId());
  });
});

describe('localData — שאלות', () => {
  it('getQuestionsFile מחזיר את הקובץ של issue-0240 ו-null לאחרים', () => {
    expect(getQuestionsFile('issue-0240')?.issueNumber).toBe(240);
    expect(getQuestionsFile('issue-0241')).toBeNull();
  });

  it('getQuestionsForWeek משמר את סדר ה-questionIds מ-schedule', () => {
    const week = getWeek('issue-0240-w1')!;
    const questions = getQuestionsForWeek(week);
    expect(questions.map((q) => q.questionId)).toEqual(week.questionIds);
  });

  it('getQuestionsForWeek מסנן questionIds שאינם בקובץ', () => {
    const week = { ...getWeek('issue-0240-w1')!, questionIds: ['q001', 'nope'] };
    expect(getQuestionsForWeek(week).map((q) => q.questionId)).toEqual(['q001']);
  });

  it('ללא questionIds — מחזיר את שאלות הקובץ לפי order', () => {
    const week = { ...getWeek('issue-0240-w2')!, questionIds: [] };
    const orders = getQuestionsForWeek(week).map((q) => q.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(orders.length).toBeGreaterThan(0);
  });

  it('מחזיר [] כשאין קובץ שאלות לגליון', () => {
    expect(getQuestionsForWeek(makeWeek())).toEqual([]);
    expect(hasQuestionsData(makeWeek())).toBe(false);
  });

  it('מחזיר [] כשהשבוע אינו בקובץ השאלות', () => {
    const week = makeWeek({ issueId: 'issue-0240', weekId: 'issue-0240-w99' });
    expect(getQuestionsForWeek(week)).toEqual([]);
  });

  it('getQuestion מאתר שאלה בודדת, ו-null לשאלה לא קיימת', () => {
    const week = getWeek('issue-0240-w1')!;
    expect(getQuestion(week, 'q001')?.letter).toBe('א');
    expect(getQuestion(week, 'q999')).toBeNull();
  });

  it('hasQuestionsData אמת לשבוע עם שאלות', () => {
    expect(hasQuestionsData(getWeek('issue-0240-w1')!)).toBe(true);
  });
});

describe('localData — עקביות מקורות', () => {
  it('לכל שבוע יש שם פרשה, טווח סימנים ומקור משנה ברורה', () => {
    for (const week of getAllWeeks()) {
      expect(week.parasha, week.weekId).toBeTruthy();
      expect(week.sourceRangeTitle, week.weekId).toBeTruthy();
      expect(week.sourceRefs.mishnaBerurah?.startRef, week.weekId).toBeTruthy();
    }
  });

  it('status של כל שבוע הוא אחד מהערכים המותרים', () => {
    for (const week of getAllWeeks()) {
      expect(['active', 'upcoming', 'past']).toContain(week.status);
    }
  });
});
