import { describe, expect, it } from 'vitest';
import { htmlToPlainText, sanitizeAnswerHtml, sanitizeSourceHtml } from '../../src/utils/html';

describe('sanitizeAnswerHtml', () => {
  it('משמר תגיות מותרות', () => {
    const html = '<p>שלום <strong>עולם</strong> <em>נטוי</em> <u>קו</u></p><ul><li>פריט</li></ul>';
    expect(sanitizeAnswerHtml(html)).toBe(html);
  });

  it('מסיר תגית script ומשמר את הטקסט הפנימי בלבד', () => {
    const out = sanitizeAnswerHtml('<p>לפני</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('<p>לפני</p>');
  });

  it('מסיר מאפייני on* ו-style', () => {
    const out = sanitizeAnswerHtml('<p onclick="alert(1)" style="color:red" class="x">טקסט</p>');
    expect(out).toBe('<p>טקסט</p>');
  });

  it('מסיר img עם onerror (וקטור XSS נפוץ)', () => {
    const out = sanitizeAnswerHtml('<p>א<img src=x onerror=alert(1)>ב</p>');
    expect(out).not.toContain('img');
    expect(out).not.toContain('onerror');
    expect(out).toBe('<p>אב</p>');
  });

  it('ממפה b→strong, i→em, div→p', () => {
    expect(sanitizeAnswerHtml('<b>מודגש</b>')).toBe('<strong>מודגש</strong>');
    expect(sanitizeAnswerHtml('<i>נטוי</i>')).toBe('<em>נטוי</em>');
    expect(sanitizeAnswerHtml('<div>בלוק</div>')).toBe('<p>בלוק</p>');
  });

  it('מנקה גם צאצאים לאחר מיפוי תגית', () => {
    const out = sanitizeAnswerHtml('<div><span onclick="x()">טקסט</span></div>');
    expect(out).toBe('<p>טקסט</p>');
  });

  it('שומר על טקסט של תגית לא מותרת (span/table)', () => {
    expect(sanitizeAnswerHtml('<span>אבג</span>')).toBe('אבג');
    expect(sanitizeAnswerHtml('<table><tr><td>תא</td></tr></table>')).toBe('תא');
  });

  it('מנקה צאצאים שהועלו בעקבות פירוק עטיפה לא-מותרת', () => {
    // עטיפה לא-מותרת אינה יכולה לשמש כמנגנון בריחה מהניקוי
    expect(sanitizeAnswerHtml('<span><img src=x onerror="alert(1)"></span>')).toBe('');
    expect(sanitizeAnswerHtml('<span><span onclick="alert(1)">א</span></span>')).toBe('א');
    expect(sanitizeAnswerHtml('<font><p onmouseover="alert(1)">א</p></font>')).toBe('<p>א</p>');
  });

  it('מסיר תגית script מקוננת בכל עומק', () => {
    expect(sanitizeAnswerHtml('<div><span><b>טקסט</b></span></div>')).toBe('<p><strong>טקסט</strong></p>');
    expect(sanitizeAnswerHtml('<table><script>x</script></table>')).not.toContain('<script');
  });

  it('מסיר הערות HTML', () => {
    expect(sanitizeAnswerHtml('<p>א</p><!-- הערה -->')).toBe('<p>א</p>');
  });

  it('מטפל בקינון עמוק ושומר מבנה רשימות', () => {
    const out = sanitizeAnswerHtml('<ol><li><strong>א</strong></li><li>ב</li></ol>');
    expect(out).toBe('<ol><li><strong>א</strong></li><li>ב</li></ol>');
  });

  it('קלט ריק מחזיר מחרוזת ריקה', () => {
    expect(sanitizeAnswerHtml('')).toBe('');
  });

  it('מסיר iframe ו-style (הטקסט של style נשאר כטקסט בלבד)', () => {
    const out = sanitizeAnswerHtml('<iframe src="evil"></iframe><style>p{}</style><p>טוב</p>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<style');
    expect(out).toContain('<p>טוב</p>');
  });

  it('משמר <br>', () => {
    expect(sanitizeAnswerHtml('<p>א<br>ב</p>')).toBe('<p>א<br>ב</p>');
  });
});

describe('sanitizeSourceHtml', () => {
  it('משמר כותרות, הדגשות והערות שוליים מהמקור', () => {
    const html = '<h3>סעיף א</h3><b>ד"ה</b><sup>1</sup><span>טקסט</span>';
    expect(sanitizeSourceHtml(html)).toBe(html);
  });

  it('מסיר script/style/iframe/link/meta לחלוטין (כולל התוכן)', () => {
    const out = sanitizeSourceHtml(
      '<script>alert(1)</script><style>b{}</style><iframe></iframe><link rel="x"><meta charset="utf-8"><p>נשאר</p>',
    );
    expect(out).toBe('<p>נשאר</p>');
  });

  it('מסיר מאפיינים כולל href ו-onclick', () => {
    const out = sanitizeSourceHtml('<a href="javascript:alert(1)" onclick="x()">קישור</a>');
    expect(out).toBe('<a>קישור</a>');
  });

  it('פורק תגיות לא מוכרות ומשמר תוכן', () => {
    expect(sanitizeSourceHtml('<table><tr><td><b>תא</b></td></tr></table>')).toBe('<b>תא</b>');
    expect(sanitizeSourceHtml('<font size="3">טקסט</font>')).toBe('טקסט');
  });

  it('צאצא שהועלה מתוך תגית לא מוכרת מנוקה גם הוא', () => {
    expect(sanitizeSourceHtml('<font><script>alert(1)</script></font>')).toBe('');
    expect(sanitizeSourceHtml('<font><img src=x onerror="alert(1)"></font>')).toBe('');
    expect(sanitizeSourceHtml('<font><b onclick="alert(1)">א</b></font>')).toBe('<b>א</b>');
  });

  it('מסיר הערות HTML', () => {
    expect(sanitizeSourceHtml('<p>א</p><!-- x -->')).toBe('<p>א</p>');
  });

  it('אינו ממפה b→strong (משמר את מבנה המקור)', () => {
    expect(sanitizeSourceHtml('<b>מודגש</b>')).toBe('<b>מודגש</b>');
  });
});

describe('htmlToPlainText', () => {
  it('ממיר <br> לשורה חדשה', () => {
    expect(htmlToPlainText('א<br>ב')).toBe('א\nב');
  });

  it('מפריד פסקאות ופריטי רשימה לשורות', () => {
    expect(htmlToPlainText('<p>ראשונה</p><p>שניה</p>')).toBe('ראשונה\nשניה');
    expect(htmlToPlainText('<ul><li>א</li><li>ב</li></ul>')).toBe('א\nב');
  });

  it('מצמצם שלוש שורות ריקות ומעלה לשתיים', () => {
    expect(htmlToPlainText('<p>א</p><br><br><br><p>ב</p>')).toBe('א\n\nב');
  });

  it('מקצץ רווחים בקצוות', () => {
    expect(htmlToPlainText('  <p>  טקסט  </p>  ')).toBe('טקסט');
  });

  it('מחזיר מחרוזת ריקה ל-HTML ריק', () => {
    expect(htmlToPlainText('')).toBe('');
    expect(htmlToPlainText('<p></p>')).toBe('');
  });

  it('אינו מריץ סקריפטים אך מוציא את הטקסט שבתגיות', () => {
    expect(htmlToPlainText('<p>טקסט</p>')).toBe('טקסט');
  });

  it('ספירת מילים על הטקסט המומר תואמת לתוכן', () => {
    const text = htmlToPlainText('<p>שלוש מילים כאן</p>');
    expect(text.split(/\s+/)).toHaveLength(3);
  });
});
