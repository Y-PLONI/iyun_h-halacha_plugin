import { beforeEach, describe, expect, it } from 'vitest';
import { buildIssueAnswersHtml, buildWeekAnswersHtml } from '../../src/export/answerHtml';
import { answersStore } from '../../src/state/answersStore';
import type { AnswerRecord } from '../../src/data/types';
import { makeSettings, makeWeek } from '../helpers/fixtures';

function setAnswer(weekId: string, over: Partial<AnswerRecord> = {}): void {
  answersStore.set((prev) => ({
    answers: {
      ...prev.answers,
      answersByWeek: {
        ...prev.answers.answersByWeek,
        [weekId]: {
          issueId: 'issue-9999',
          weekId,
          answerHtml: '<p>תשובה שלי</p>',
          answerText: 'תשובה שלי',
          status: 'draft',
          wordCount: 2,
          lastSavedAt: '2026-01-01T00:00:00.000Z',
          ...over,
        },
      },
    },
  }));
}

const meta = {
  settings: makeSettings({ name: 'ישראל ישראלי', personalCode: '12345' }),
  issueTitle: 'עיון ההלכה - גליון ר"מ',
  hebrewMonth: 'סיון תשפ"ו',
  dateLabel: '1.1.2026',
};

beforeEach(() => {
  answersStore.set({ answers: { schemaVersion: 2, updatedAt: '', answersByWeek: {} } });
});

describe('buildWeekAnswersHtml', () => {
  it('בונה כותרת עם שם הגליון, חודש, שם, קוד ותאריך', () => {
    const html = buildWeekAnswersHtml({ week: makeWeek(), ...meta });
    expect(html).toContain('<h1>תשובות לעיון ההלכה - עיון ההלכה - גליון ר"מ</h1>');
    expect(html).toContain('<p>סיון תשפ"ו</p>');
    expect(html).toContain('<p>שם: ישראל ישראלי</p>');
    expect(html).toContain('<p>קוד אישי: 12345</p>');
    expect(html).toContain('<p>תאריך יצירה: 1.1.2026</p>');
  });

  it('משמיט שדות ריקים (שם/קוד/חודש)', () => {
    const html = buildWeekAnswersHtml({
      week: makeWeek(),
      ...meta,
      settings: makeSettings({ name: '', personalCode: '' }),
      hebrewMonth: '',
    });
    expect(html).not.toContain('שם:');
    expect(html).not.toContain('קוד אישי:');
    expect(html).toContain('תאריך יצירה');
  });

  it('כולל כותרת שבוע וטווח סימנים', () => {
    const html = buildWeekAnswersHtml({ week: makeWeek(), ...meta });
    expect(html).toContain('<h2>שבוע 1 - פרשת שלח לך</h2>');
    expect(html).toContain('<p>מסימן תקלט עד סימן תקמב</p>');
  });

  it('מכניס את תשובת השבוע כפי שנשמרה', () => {
    const week = makeWeek();
    setAnswer(week.weekId, { answerHtml: '<p>תשובתי <strong>המודגשת</strong></p>', answerText: 'תשובתי המודגשת' });
    expect(buildWeekAnswersHtml({ week, ...meta })).toContain('<p>תשובתי <strong>המודגשת</strong></p>');
  });

  it('מציג מקף כשאין תשובה', () => {
    expect(buildWeekAnswersHtml({ week: makeWeek(), ...meta })).toContain('<p>—</p>');
  });

  it('מציג מקף כשהתשובה ריקה מתוכן (רווחים בלבד)', () => {
    const week = makeWeek();
    setAnswer(week.weekId, { answerHtml: '<p>   </p>', answerText: '   ' });
    expect(buildWeekAnswersHtml({ week, ...meta })).toContain('<p>—</p>');
  });

  it('מקודד תווי HTML בשדות המשתמש (מונע שבירת המסמך)', () => {
    const html = buildWeekAnswersHtml({
      week: makeWeek({ parasha: 'א<b>ב' }),
      ...meta,
      settings: makeSettings({ name: '<script>x</script>', personalCode: 'a&b' }),
    });
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('a&amp;b');
    expect(html).toContain('א&lt;b&gt;ב');
  });
});

describe('buildIssueAnswersHtml', () => {
  it('כולל כותרת אחת וכל השבועות בסדר', () => {
    const weeks = [
      makeWeek({ weekId: 'w1', weekNumber: 1, parasha: 'שלח לך' }),
      makeWeek({ weekId: 'w2', weekNumber: 2, parasha: 'קרח' }),
    ];
    setAnswer('w1', { answerHtml: '<p>ראשונה</p>', answerText: 'ראשונה' });
    setAnswer('w2', { answerHtml: '<p>שניה</p>', answerText: 'שניה' });
    const html = buildIssueAnswersHtml(weeks, meta);
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html.match(/<h2>/g)).toHaveLength(2);
    expect(html.indexOf('ראשונה')).toBeLessThan(html.indexOf('שניה'));
  });

  it('שבועות ללא תשובה מקבלים מקף', () => {
    const weeks = [makeWeek({ weekId: 'w1' }), makeWeek({ weekId: 'w2', weekNumber: 2 })];
    setAnswer('w1', { answerHtml: '<p>יש</p>', answerText: 'יש' });
    const html = buildIssueAnswersHtml(weeks, meta);
    expect(html).toContain('<p>יש</p>');
    expect(html).toContain('<p>—</p>');
  });

  it('רשימת שבועות ריקה מחזירה כותרת בלבד', () => {
    const html = buildIssueAnswersHtml([], meta);
    expect(html).toContain('<h1>');
    expect(html).not.toContain('<h2>');
  });
});
