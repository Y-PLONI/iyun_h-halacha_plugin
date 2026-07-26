import { describe, expect, it } from 'vitest';
import { escapeXml, htmlToOoxml, makeZip, packageDocx } from '../../src/export/ooxml';
import { crc32, readZipEntries, readZipFromBlob } from '../helpers/zip';

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
  it('עוטף פסקה עם bidi ויישור לימין', () => {
    const xml = htmlToOoxml('<p>שלום</p>');
    expect(xml).toContain('<w:bidi/>');
    expect(xml).toContain('<w:jc w:val="right"/>');
    expect(xml).toContain('<w:t xml:space="preserve">שלום</w:t>');
  });

  it('מוסיף rtl ושפה עברית לכל run', () => {
    const xml = htmlToOoxml('<p>טקסט</p>');
    expect(xml).toContain('<w:rtl/>');
    expect(xml).toContain('<w:lang w:val="he-IL" w:bidi="he-IL"/>');
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
    expect(ol).toContain('<w:ind w:right="360"/>');
    expect(htmlToOoxml('<ul><li>פריט</li></ul>')).toContain('• ');
  });

  it('ממיר br לפסקה ריקה', () => {
    expect(htmlToOoxml('<br>')).toBe('<w:p><w:pPr><w:bidi/></w:pPr></w:p>');
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
    expect(htmlToOoxml('')).toBe('<w:p><w:pPr><w:bidi/></w:pPr></w:p>');
    expect(htmlToOoxml('   ')).toBe('<w:p><w:pPr><w:bidi/></w:pPr></w:p>');
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
    expect(settings.text).toContain('w:themeFontLang w:val="he-IL"');
  });

  it('Content_Types כולל override לכל חלק XML', async () => {
    const entries = await readZipFromBlob(packageDocx('<w:p/>'));
    const ct = entries.find((e) => e.name === '[Content_Types].xml')!;
    expect(ct.text).toContain('/word/document.xml');
    expect(ct.text).toContain('/word/styles.xml');
    expect(ct.text).toContain('/word/settings.xml');
  });
});
