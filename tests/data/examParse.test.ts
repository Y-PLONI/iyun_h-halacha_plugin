import { describe, expect, it } from 'vitest';
import { parseExamHtml } from '../../src/data/examParse';
import { examDocHtml, mammothHtml } from '../helpers/fixtures';

describe('parseExamHtml — מטא-דאטה של הגליון', () => {
  it('מזהה כותרת גליון וחודש עברי מהפתיח', () => {
    const doc = parseExamHtml('issue-9999', examDocHtml());
    expect(doc.schemaVersion).toBe(1);
    expect(doc.issueId).toBe('issue-9999');
    expect(doc.issueTitle).toBe('עיון ההלכה - גליון בדיקה');
    expect(doc.hebrewMonth).toBe('סיון תשפ"ו');
    expect(doc.sourceFile).toBe('issue-9999.docx');
  });

  it('נופל ל-issueId כשאין שורת "גליון"', () => {
    const doc = parseExamHtml('issue-1', mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'א] שאלה']));
    expect(doc.issueTitle).toBe('issue-1');
    expect(doc.hebrewMonth).toBe('');
  });

  it('אינו לוקח שדה טופס ("שם:") כחודש עברי', () => {
    const doc = parseExamHtml('issue-1', mammothHtml(['גליון א', 'שם:', '(שבוע 1 מתוך 1)', 'שבוע פרשת נח']));
    expect(doc.hebrewMonth).toBe('');
  });

  it('מסמך ללא מרקרי שבוע מחזיר רשימת שבועות ריקה', () => {
    const doc = parseExamHtml('issue-1', mammothHtml(['גליון א', 'טקסט חופשי']));
    expect(doc.weeks).toEqual([]);
    expect(doc.issueTitle).toBe('גליון א');
  });
});

describe('parseExamHtml — פיצול לשבועות', () => {
  const doc = parseExamHtml('issue-9999', examDocHtml());

  it('מפצל לפי מרקר "(שבוע N מתוך M)"', () => {
    expect(doc.weeks.map((w) => w.weekNumber)).toEqual([1, 2]);
  });

  it('בונה headerText נקי (בלי "שבוע פרשת", מקפים → ·)', () => {
    expect(doc.weeks[0].headerText).toBe('שלח לך · דיני ציצית');
  });

  it('תומך בכותרת שבוע ללא המילה "פרשת"', () => {
    expect(doc.weeks[1].headerText).toBe('קרח');
  });

  it('מחלץ את שורת טווח הסימנים ומוציא אותה מגוף השאלות', () => {
    expect(doc.weeks[0].sourceRangeTitle).toBe('מסימן תקלט עד סימן תקמ');
    expect(doc.weeks[0].html).not.toContain('מסימן תקלט עד סימן תקמ');
  });

  it('מזהה גם טווח בכתיב מקוצר (מסי\')', () => {
    expect(doc.weeks[1].sourceRangeTitle).toBe("מסי' תקמא");
  });

  it('מסנן מרקרים, קווי הפרדה, שדות טופס וכותרות עמוד חוזרות', () => {
    const all = doc.weeks.map((w) => w.html).join('\n');
    expect(all).not.toContain('מתוך');
    expect(all).not.toContain('-----');
    expect(all).not.toContain('קוד אישי');
    expect(all).not.toContain('בס"ד');
    expect(all).not.toContain('גליון בדיקה');
    expect(all).not.toContain('סיון תשפ"ו');
  });
});

describe('parseExamHtml — שאלות ותת-שאלות', () => {
  it('בונה exam-q עם אות השאלה ו-exam-sub לתת-שאלות', () => {
    const [week] = parseExamHtml('issue-9999', examDocHtml()).weeks;
    expect(week.html).toContain('<p class="exam-q"><span class="exam-q-letter">א]</span> כיסוי הראש</p>');
    expect(week.html).toContain('<p class="exam-sub">א, האם מותר?</p>');
    expect(week.html).toContain('<p class="exam-sub">ב, ומה הדין בשבת?</p>');
  });

  it('תומך בשתי צורות סימון שאלה: "א]" ו-"[א]"', () => {
    const doc = parseExamHtml(
      'i',
      mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א', 'א] ראשונה', '[ב] שניה']),
    );
    const { html } = doc.weeks[0];
    expect(html).toContain('>א]</span> ראשונה');
    expect(html).toContain('>ב]</span> שניה');
  });

  it('מפריד כותרת שאלה מתת-שאלה ראשונה שמופיעה באותה פסקה', () => {
    const doc = parseExamHtml(
      'i',
      mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א', 'א] נושא השאלה - א, פרט ראשון']),
    );
    expect(doc.weeks[0].html).toBe(
      '<p class="exam-q"><span class="exam-q-letter">א]</span> נושא השאלה</p>\n' +
        '<p class="exam-sub">א, פרט ראשון</p>',
    );
  });

  it('אינו מפצל כשאין תת-שאלה בפורמט "<אות>,"', () => {
    const doc = parseExamHtml(
      'i',
      mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א', 'א] נושא - הרחבה כללית']),
    );
    expect(doc.weeks[0].html).toContain('>א]</span> נושא - הרחבה כללית</p>');
    expect(doc.weeks[0].html).not.toContain('exam-sub');
  });

  it('מקודד תווי HTML מיוחדים בטקסט השאלות', () => {
    const doc = parseExamHtml(
      'i',
      mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א', 'א] &lt;script&gt; &amp; עוד']),
    );
    expect(doc.weeks[0].html).toContain('&lt;script&gt; &amp; עוד');
    expect(doc.weeks[0].html).not.toContain('<script>');
  });

  it('מסיר תגיות פנימיות (strong) ומצמצם רווחים', () => {
    const doc = parseExamHtml(
      'i',
      '<p>(שבוע 1 מתוך 1)</p><p><strong>שבוע פרשת נח</strong></p><p>מסימן א</p>' +
        '<p><strong>א]</strong>   הרבה     רווחים</p>',
    );
    expect(doc.weeks[0].html).toContain('>א]</span> הרבה רווחים</p>');
  });

  it('מחזיר גוף ריק כשאין שאלות בשבוע', () => {
    const doc = parseExamHtml('i', mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א']));
    expect(doc.weeks[0].html).toBe('');
  });

  it('שומר פסקאות ללא אות שאלה כ-exam-sub (המשך שאלה)', () => {
    const doc = parseExamHtml(
      'i',
      mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'מסימן א', 'א] שאלה', 'הערה נוספת']),
    );
    expect(doc.weeks[0].html).toContain('<p class="exam-sub">הערה נוספת</p>');
  });

  it('כשאין שורת טווח — השאלות מתחילות מיד אחרי הכותרת', () => {
    const doc = parseExamHtml('i', mammothHtml(['(שבוע 1 מתוך 1)', 'שבוע פרשת נח', 'א] שאלה']));
    expect(doc.weeks[0].sourceRangeTitle).toBe('');
    expect(doc.weeks[0].headerText).toBe('נח');
    expect(doc.weeks[0].html).toContain('>א]</span> שאלה');
  });
});
