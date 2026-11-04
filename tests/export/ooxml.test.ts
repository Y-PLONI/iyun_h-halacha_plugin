import { describe, expect, it } from 'vitest';
import { escapeXml, htmlToOoxml, makeZip, packageDocx } from '../../src/export/ooxml';
import { crc32, readZipEntries, readZipFromBlob } from '../helpers/zip';
import { sanitizeAnswerHtml } from '../../src/utils/html';

/** סימן-פסקה עברי (RTL + שפת bidi עברית): הסמן בפסקה ריקה נשאר עברי. */
const PMARK = '<w:rPr><w:rFonts w:cs="David" w:hint="cs"/><w:rtl/><w:lang w:val="en-US" w:bidi="he-IL"/></w:rPr>';

describe('escapeXml', () => {
  it('מקודד &, < ו->', () => {
    expect(escapeXml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('מקודד & לפני שאר התווים (ללא קידוד כפול)', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
  });

  it('ממיר קלט שאינו מחרוזת', () => {
    expect(escapeXml(5 as unknown as string)).toBe('5');
  });

  it('מסיר תווים שאסורים ב-XML 1.0 (למשל VT מהדבקה מ-Word), ומשאיר טאב/שורה חדשה', () => {
    expect(escapeXml('a\u000Bb\u000Cc\u0000d\u001Fe\uFFFEf\uFFFF')).toBe('abcdef');
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd');
    expect(escapeXml('שלום\u00A0עולם')).toBe('שלום\u00A0עולם');
  });

  it('הפלט של htmlToOoxml עם תו בקרה הוא XML תקין', () => {
    const xml = htmlToOoxml('<p>שורה\u000Bשנייה</p>');
    const doc = new DOMParser().parseFromString(
      `<w:body xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${xml}</w:body>`,
      'application/xml',
    );
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(xml).toContain('שורהשנייה');
  });
});

describe('makeZip', () => {
  it('בונה ZIP קריא עם שמות ותוכן נכונים', () => {
    const zip = makeZip([
      { name: 'a.txt', text: 'שלום' },
      { name: 'dir/b.xml', text: '<x/>' },
    ]);
    const entries = readZipEntries(zip);
    expect(entries.map((e) => e.name)).toEqual(['a.txt', 'dir/b.xml']);
    expect(entries[0].text).toBe('שלום');
    expect(entries[1].text).toBe('<x/>');
  });

  it('שומר ללא דחיסה (method=0) עם גדלים תואמים', () => {
    const entries = readZipEntries(makeZip([{ name: 'a.txt', text: 'abc' }]));
    expect(entries[0].method).toBe(0);
    expect(entries[0].compSize).toBe(3);
    expect(entries[0].uncompSize).toBe(3);
  });

  it('מחשב CRC32 נכון (כולל UTF-8 רב-בייטי)', () => {
    const text = 'תשובות עיון ההלכה';
    const entries = readZipEntries(makeZip([{ name: 'a.txt', text }]));
    expect(entries[0].crc).toBe(crc32(new TextEncoder().encode(text)));
    expect(entries[0].uncompSize).toBe(new TextEncoder().encode(text).length);
  });

  it('מתחיל בחתימת ZIP ומסתיים ב-EOCD', () => {
    const zip = makeZip([{ name: 'a.txt', text: 'x' }]);
    expect([...zip.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect([...zip.slice(-22, -18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('תומך ברשימת קבצים ריקה', () => {
    expect(readZipEntries(makeZip([]))).toEqual([]);
  });
});

describe('htmlToOoxml', () => {
  it('עוטף פסקה עם bidi, בלי jc (ברירת המחדל בפסקת bidi: יישור לצד ההתחלה = ימין)', () => {
    const xml = htmlToOoxml('<p>שלום</p>');
    expect(xml).toContain('<w:bidi/>');
    // ב-bidi, Word מפרש jc="right" כצד הסוף (שמאל) — לכן לא כותבים jc כלל, כמו Word עצמו
    expect(xml).not.toContain('<w:jc');
    expect(xml).toContain('<w:t xml:space="preserve">שלום</w:t>');
  });

  it('מוסיף rtl ושפה עברית לכל run', () => {
    const xml = htmlToOoxml('<p>טקסט</p>');
    expect(xml).toContain('<w:rtl/>');
    expect(xml).toContain('<w:lang w:val="en-US" w:bidi="he-IL"/>');
    expect(xml).toContain('w:cs="David"');
  });

  it('ממפה strong/b ל-w:b', () => {
    expect(htmlToOoxml('<p><strong>מודגש</strong></p>')).toContain('<w:b/><w:bCs/>');
    expect(htmlToOoxml('<p><b>מודגש</b></p>')).toContain('<w:b/><w:bCs/>');
  });

  it('ממפה em/i ל-w:i ו-u ל-underline', () => {
    expect(htmlToOoxml('<p><em>נטוי</em></p>')).toContain('<w:i/><w:iCs/>');
    expect(htmlToOoxml('<p><i>נטוי</i></p>')).toContain('<w:i/><w:iCs/>');
    expect(htmlToOoxml('<p><u>קו</u></p>')).toContain('<w:u w:val="single"/>');
  });

  it('משמר עיצוב מקונן (מודגש+נטוי יחד)', () => {
    const xml = htmlToOoxml('<p><strong><em>שניהם</em></strong></p>');
    expect(xml).toMatch(/<w:b\/><w:bCs\/><w:i\/><w:iCs\/>/);
  });

  it('ממפה h1/h2/h3 לסגנונות כותרת', () => {
    expect(htmlToOoxml('<h1>כותרת</h1>')).toContain('<w:pStyle w:val="Heading1"/>');
    expect(htmlToOoxml('<h2>כותרת</h2>')).toContain('<w:pStyle w:val="Heading2"/>');
    expect(htmlToOoxml('<h3>כותרת</h3>')).toContain('<w:pStyle w:val="Heading3"/>');
  });

  it('h4 נשאר פסקה רגילה', () => {
    const xml = htmlToOoxml('<h4>כותרת</h4>');
    expect(xml).not.toContain('pStyle');
    expect(xml).toContain('כותרת');
  });

  it('ממספר פריטי ol ומוסיף תבליט ל-ul, עם הזחה', () => {
    const ol = htmlToOoxml('<ol><li>ראשון</li><li>שני</li></ol>');
    expect(ol).toContain('1. ');
    expect(ol).toContain('2. ');
    // הזחה מצד ההתחלה (ימין) של פסקת bidi נכתבת ב-w:left, כמו ברשימות עבריות ש-Word יוצר
    expect(ol).toContain('<w:ind w:left="360"/>');
    expect(ol).not.toContain('w:right');
    expect(htmlToOoxml('<ul><li>פריט</li></ul>')).toContain('• ');
  });

  it('ממיר br לפסקה ריקה', () => {
    expect(htmlToOoxml('<br>')).toBe('<w:p><w:pPr><w:bidi/>' + PMARK + '</w:pPr></w:p>');
  });

  it('פורק div/blockquote שמכילים בלוקים לפסקאות נפרדות', () => {
    const xml = htmlToOoxml('<div><p>א</p><p>ב</p></div>');
    expect(xml.match(/<w:p>/g)).toHaveLength(2);
  });

  it('מקודד תווי XML מיוחדים בטקסט', () => {
    const xml = htmlToOoxml('<p>&lt;tag&gt; &amp; more</p>');
    expect(xml).toContain('&lt;tag&gt; &amp; more');
    expect(xml).not.toContain('<tag>');
  });

  it('מטפל בטקסט ללא עטיפת פסקה', () => {
    expect(htmlToOoxml('טקסט חופשי')).toContain('טקסט חופשי');
  });

  it('קלט ריק מחזיר פסקה ריקה אחת', () => {
    expect(htmlToOoxml('')).toBe('<w:p><w:pPr><w:bidi/>' + PMARK + '</w:pPr></w:p>');
    expect(htmlToOoxml('   ')).toBe('<w:p><w:pPr><w:bidi/>' + PMARK + '</w:pPr></w:p>');
  });

  it('שומר על סדר הפסקאות', () => {
    const xml = htmlToOoxml('<p>ראשונה</p><p>שניה</p><p>שלישית</p>');
    expect(xml.indexOf('ראשונה')).toBeLessThan(xml.indexOf('שניה'));
    expect(xml.indexOf('שניה')).toBeLessThan(xml.indexOf('שלישית'));
  });
});

describe('packageDocx', () => {
  it('בונה חבילת DOCX עם כל החלקים הנדרשים', async () => {
    const blob = packageDocx(htmlToOoxml('<p>תשובה</p>'));
    const entries = await readZipFromBlob(blob);
    expect(entries.map((e) => e.name)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/_rels/document.xml.rels',
      'word/styles.xml',
      'word/settings.xml',
    ]);
  });

  it('מחזיר Blob עם MIME של docx', () => {
    const blob = packageDocx('<w:p/>');
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it('document.xml מכיל את הגוף, sectPr ו-RTL', async () => {
    const entries = await readZipFromBlob(packageDocx(htmlToOoxml('<p>תשובה שלי</p>')));
    const doc = entries.find((e) => e.name === 'word/document.xml')!;
    expect(doc.text).toContain('תשובה שלי');
    expect(doc.text).toContain('<w:sectPr>');
    expect(doc.text).toContain('<w:rtlGutter/>');
    expect(doc.text).toContain('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  });

  it('styles.xml מגדיר Normal ו-Heading1..3 עם גופן David', async () => {
    const entries = await readZipFromBlob(packageDocx('<w:p/>'));
    const styles = entries.find((e) => e.name === 'word/styles.xml')!;
    for (const id of ['Normal', 'Heading1', 'Heading2', 'Heading3']) {
      expect(styles.text).toContain(`w:styleId="${id}"`);
    }
    expect(styles.text).toContain('w:cs="David"');
  });

  it('settings.xml מגדיר bidi ושפה עברית', async () => {
    const entries = await readZipFromBlob(packageDocx('<w:p/>'));
    const settings = entries.find((e) => e.name === 'word/settings.xml')!;
    expect(settings.text).toContain('<w:bidi/>');
    expect(settings.text).toContain('w:themeFontLang w:val="en-US"');
  });

  it('Content_Types כולל override לכל חלק XML', async () => {
    const entries = await readZipFromBlob(packageDocx('<w:p/>'));
    const ct = entries.find((e) => e.name === '[Content_Types].xml')!;
    expect(ct.text).toContain('/word/document.xml');
    expect(ct.text).toContain('/word/styles.xml');
    expect(ct.text).toContain('/word/settings.xml');
  });
});

describe('כיוון ושפה בעריכה ב-Word', () => {
  it('כל פסקה (כולל ריקה, כותרת ורשימה) נושאת bidi וסימן-פסקה RTL עברי', () => {
    const xml = htmlToOoxml('<h1>כותרת</h1><p>טקסט</p><br><ol><li>א</li></ol>');
    const paras = xml.match(/<w:p>.*?<\/w:p>/g)!;
    expect(paras.length).toBeGreaterThanOrEqual(4);
    for (const p of paras) {
      expect(p).toContain('<w:bidi/>');
      expect(p).toContain('<w:pPr>');
      expect(p).toMatch(/<w:pPr>.*<w:rPr><w:rFonts w:cs="David" w:hint="cs"\/><w:rtl\/><w:lang w:val="en-US" w:bidi="he-IL"\/><\/w:rPr><\/w:pPr>/);
    }
  });

  it('שפת הטקסט הלטינית אינה he-IL בשום מקום (כמו ב-Word עצמו)', async () => {
    const doc = packageDocx(htmlToOoxml('<p>שלום</p>'));
    const entries = await readZipFromBlob(doc);
    for (const e of entries) {
      expect(e.text ?? '', e.name).not.toContain('w:val="he-IL"');
    }
  });

  it('ברשימות הסדר bidi → ind → rPr (סדר התקני של ה-schema)', () => {
    const xml = htmlToOoxml('<ul><li>א</li></ul>');
    expect(xml.indexOf('<w:bidi')).toBeLessThan(xml.indexOf('<w:ind'));
    expect(xml.indexOf('<w:ind')).toBeLessThan(xml.indexOf('<w:rPr'));
  });

  it('גם בסגנונות של חבילת ה-DOCX אין jc (יישור לפי כיוון הפסקה)', async () => {
    const entries = await readZipFromBlob(packageDocx(htmlToOoxml('<p>א</p>')));
    const xml = entries.find((e) => e.name === 'word/styles.xml')!.text ?? '';
    expect(xml).toContain('<w:bidi/>');
    expect(xml).not.toContain('<w:jc');
  });
});

/** סדר הילדים ב-CT_RPr (החלק הרלוונטי) וב-CT_PPr לפי ה-schema של OOXML. */
const RPR_ORDER = ['w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:u', 'w:rtl', 'w:lang'];
const PPR_ORDER = ['w:pStyle', 'w:bidi', 'w:ind', 'w:jc', 'w:rPr'];

/** שמות הילדים הישירים של אלמנט (לפי סדר הופעתם). */
function childNames(el: Element): string[] {
  return Array.from(el.children).map((c) => c.tagName);
}

function expectSchemaOrder(names: string[], order: string[], label: string) {
  for (const n of names) expect(order, `${label}: ${n} לא צפוי`).toContain(n);
  const idx = names.map((n) => order.indexOf(n));
  expect(idx, `${label}: ${names.join(',')}`).toEqual([...idx].sort((a, b) => a - b));
}

/** מפענח את פלט htmlToOoxml כ-XML אמיתי (כולל namespace) כדי לבדוק מבנה ולא רק מחרוזות. */
function parseBody(xml: string): Document {
  const doc = new DOMParser().parseFromString(
    `<w:body xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${xml}</w:body>`,
    'application/xml',
  );
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  return doc;
}

const ALL_KINDS =
  '<h1>כותרת</h1><h2>משנה</h2><p>רגיל <strong>מודגש</strong> <em>נטוי</em> <u>קו</u></p>' +
  '<p><u><strong>הפוך</strong></u> <b><strong>כפול</strong></b> <i><em><u>הכול</u></em></i></p>' +
  '<br><ol><li>ראשון <b>מודגש</b></li><li>שני</li></ol><ul><li>תבליט</li></ul>' +
  '<blockquote>ציטוט</blockquote><div><p>א</p>טקסט חופשי</div>' +
  '<p>שורה<br><strong>מודגשת<br>שבורה</strong></p><ol><li>אב<ul><li>בן</li></ul></li></ol>';

describe('עקביות rPr/pPr בכל run ופסקה', () => {
  it('כל run (כולל קידומת תבליט/מספור) נושא rFonts David, rtl ו-lang עברי', () => {
    const doc = parseBody(htmlToOoxml(ALL_KINDS));
    const runs = Array.from(doc.getElementsByTagName('w:r'));
    expect(runs.length).toBeGreaterThan(10);
    for (const r of runs) {
      const label = r.textContent ?? '';
      expect(r.firstElementChild?.tagName, label).toBe('w:rPr');
      const rPr = r.firstElementChild!;
      const fonts = rPr.getElementsByTagName('w:rFonts')[0];
      expect(fonts?.getAttribute('w:cs'), label).toBe('David');
      expect(fonts?.getAttribute('w:hint'), label).toBe('cs');
      expect(rPr.getElementsByTagName('w:rtl'), label).toHaveLength(1);
      const lang = rPr.getElementsByTagName('w:lang');
      expect(lang, label).toHaveLength(1);
      expect(lang[0].getAttribute('w:val')).toBe('en-US');
      expect(lang[0].getAttribute('w:bidi')).toBe('he-IL');
    }
  });

  it('קידומת הרשימה זהה ב-rPr לטקסט הפריט', () => {
    const doc = parseBody(htmlToOoxml('<ol><li>פריט</li></ol><ul><li>פריט</li></ul>'));
    for (const p of Array.from(doc.getElementsByTagName('w:p'))) {
      const [prefix, text] = Array.from(p.getElementsByTagName('w:r'));
      expect(['1. ', '• ']).toContain(prefix.textContent);
      expect(prefix.getElementsByTagName('w:rPr')[0].outerHTML).toBe(
        text.getElementsByTagName('w:rPr')[0].outerHTML,
      );
    }
  });

  it('ילדי rPr מופיעים בסדר ה-schema וללא כפילויות (גם בקינון הפוך/כפול)', () => {
    const doc = parseBody(htmlToOoxml(ALL_KINDS));
    for (const rPr of Array.from(doc.getElementsByTagName('w:rPr'))) {
      const names = childNames(rPr);
      expect(new Set(names).size, names.join(',')).toBe(names.length);
      expectSchemaOrder(names, RPR_ORDER, 'rPr');
    }
  });

  it('קינון <u><strong> מפיק b לפני u', () => {
    const xml = htmlToOoxml('<p><u><strong>x</strong></u></p>');
    expect(xml).toContain('<w:b/><w:bCs/><w:u w:val="single"/><w:rtl/>');
  });

  it('כל פסקה: pPr ראשון, ילדיו בסדר ה-schema ו-rPr (סימן הפסקה) אחרון', () => {
    const doc = parseBody(htmlToOoxml(ALL_KINDS));
    const paras = Array.from(doc.getElementsByTagName('w:p'));
    expect(paras.length).toBeGreaterThan(8);
    for (const p of paras) {
      expect(p.firstElementChild?.tagName).toBe('w:pPr');
      const names = childNames(p.firstElementChild!);
      expectSchemaOrder(names, PPR_ORDER, 'pPr');
      expect(names.at(-1)).toBe('w:rPr');
      expect(names).toContain('w:bidi');
      expect(names).not.toContain('w:jc');
    }
  });
});

/** תקציר פסקאות: טקסט (w:br כ-⏎), הזחה ימנית ומספר שבירות. */
function summarize(xml: string) {
  const doc = parseBody(xml);
  return Array.from(doc.getElementsByTagName('w:p')).map((p) => {
    let text = '';
    for (const r of Array.from(p.getElementsByTagName('w:r'))) {
      for (const c of Array.from(r.children)) {
        if (c.tagName === 'w:t') text += c.textContent;
        if (c.tagName === 'w:br') text += '⏎';
      }
    }
    const ind = p.getElementsByTagName('w:ind')[0]?.getAttribute('w:left') ?? null;
    return { text, ind };
  });
}

const EMPTY_P = '<w:p><w:pPr><w:bidi/>' + PMARK + '</w:pPr></w:p>';

describe('בלוקים ריקים ו-NBSP', () => {
  it('<p></p> ריק (בגובה 0 בעורך) לא הופך לפסקה ריקה ב-Word', () => {
    // div מקונן בעורך → אחרי המיפוי DIV→P ופענוח מחדש: <p></p><p>x</p><p></p>
    expect(summarize(htmlToOoxml('<p></p><p>כפול</p><p></p>'))).toEqual([{ text: 'כפול', ind: null }]);
    expect(summarize(htmlToOoxml(sanitizeAnswerHtml('<div><div>כפול</div></div>'))).map((p) => p.text)).toEqual([
      'כפול',
    ]);
  });

  it('שורה ריקה אמיתית (<p><br></p>) עדיין נשמרת, וקלט ריק לגמרי — פסקה ריקה אחת', () => {
    expect(summarize(htmlToOoxml('<p>א</p><p><br></p><p>ב</p>')).map((p) => p.text)).toEqual(['א', '', 'ב']);
    expect(htmlToOoxml('<p></p>')).toBe(EMPTY_P);
  });

  it('NBSP הוא תוכן גלוי: שבירה לפניו נשמרת, ופסקה שכולה NBSP אינה נעלמת', () => {
    expect(summarize(htmlToOoxml('<p>א<br>&nbsp;</p>'))[0].text).toBe('א⏎\u00A0');
    expect(summarize(htmlToOoxml('<p>&nbsp;</p>'))).toEqual([{ text: '\u00A0', ind: null }]);
  });
});

describe('שבירות שורה (<br>) בתוך פסקה', () => {
  it('Shift+Enter בתוך פסקה: run של w:br עם rPr מלא, בין שני חלקי הטקסט', () => {
    const xml = htmlToOoxml('<p>א<br>ב</p>');
    expect(summarize(xml)).toEqual([{ text: 'א⏎ב', ind: null }]);
    expect(xml).toContain('<w:r>' + PMARK + '<w:br/></w:r>');
  });

  it('w:br יורש את עיצוב התג העוטף', () => {
    const xml = htmlToOoxml('<p><strong>א<br>ב</strong></p>');
    expect(xml).toMatch(/<w:r><w:rPr><w:rFonts[^>]*\/><w:b\/><w:bCs\/><w:rtl\/><w:lang[^>]*\/><\/w:rPr><w:br\/><\/w:r>/);
  });

  it('שורה ריקה של העורך (<p><br></p> / <div><br></div>) היא פסקה ריקה אחת, בלי שבירה', () => {
    expect(htmlToOoxml('<p><br></p>')).toBe(EMPTY_P);
    expect(htmlToOoxml('<div><br></div>')).toBe(EMPTY_P);
  });

  it('<br> אחרון בבלוק ("a<br><br>") הוא ממלא מקום: נספרת שבירה אחת בלבד', () => {
    expect(summarize(htmlToOoxml('<p>א<br><br></p>'))).toEqual([{ text: 'א⏎', ind: null }]);
    expect(summarize(htmlToOoxml('<p>א<br></p>'))).toEqual([{ text: 'א', ind: null }]);
  });

  it('פלט העורך אחרי ניקוי: div->p, שורה ריקה באמצע נשמרת כפסקה ריקה', () => {
    const html = sanitizeAnswerHtml('<div>א</div><div><br></div><div>ב<br>ג</div>');
    expect(summarize(htmlToOoxml(html))).toEqual([
      { text: 'א', ind: null },
      { text: '', ind: null },
      { text: 'ב⏎ג', ind: null },
    ]);
  });

  it('inline בראש העורך ("a<br>b" לפני בלוק) הוא פסקה אחת עם שבירה', () => {
    expect(summarize(htmlToOoxml('א<br>ב<p>ג</p>'))).toEqual([
      { text: 'א⏎ב', ind: null },
      { text: 'ג', ind: null },
    ]);
  });

  it('<br> בודד בין בלוקים נשאר שורה ריקה (כל אחד)', () => {
    expect(summarize(htmlToOoxml('<p>א</p><br><br><p>ב</p>')).map((p) => p.text)).toEqual(['א', '', '', 'ב']);
  });

  it('שבירה בתוך פריט רשימה, ו-<br> לפני רשימה מקוננת אינו שבירה', () => {
    expect(summarize(htmlToOoxml('<ul><li>א<br>ב</li></ul>'))[0].text).toBe('• א⏎ב');
    expect(htmlToOoxml('<ul><li>א<br><ul><li>ב</li></ul></li></ul>')).not.toContain('<w:br/>');
  });
});

describe('רשימות מקוננות', () => {
  it('רק li ישירים; הרשימה המקוננת אחרי טקסט ההורה, מוזחת יותר, בלי כפילות טקסט', () => {
    const xml = htmlToOoxml('<ol><li>א<ul><li>ב</li><li>ג</li></ul></li><li>ד</li></ol>');
    expect(summarize(xml)).toEqual([
      { text: '1. א', ind: '360' },
      { text: '• ב', ind: '720' },
      { text: '• ג', ind: '720' },
      { text: '2. ד', ind: '360' },
    ]);
  });

  it('רשימה כילד ישיר של רשימה (קינון של Chrome ב"הגדל הזחה") — רמה מקוננת, המספור נמשך', () => {
    const xml = htmlToOoxml('<ol><li>א</li><ol><li>ב</li></ol><li>ג</li></ol>');
    expect(summarize(xml)).toEqual([
      { text: '1. א', ind: '360' },
      { text: '1. ב', ind: '720' },
      { text: '2. ג', ind: '360' },
    ]);
  });

  it('שלוש רמות קינון', () => {
    const xml = htmlToOoxml('<ul><li>א<ul><li>ב<ol><li>ג</li></ol></li></ul></li></ul>');
    expect(summarize(xml)).toEqual([
      { text: '• א', ind: '360' },
      { text: '• ב', ind: '720' },
      { text: '1. ג', ind: '1080' },
    ]);
  });

  it('פריט מעוצב עם רשימה מקוננת — הטקסט לא מוכפל', () => {
    const xml = htmlToOoxml('<ul><li><strong>א</strong><ul><li>ב</li></ul></li></ul>');
    expect(summarize(xml).map((p) => p.text)).toEqual(['• א', '• ב']);
  });
});
