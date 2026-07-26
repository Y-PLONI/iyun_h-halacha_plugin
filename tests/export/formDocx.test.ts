import { describe, expect, it } from 'vitest';
import { buildAnswerFormDocx, toGematria, type FormFieldValues } from '../../src/export/formDocx';
import { readZipFromBlob } from '../helpers/zip';
import { crc32 } from '../helpers/zip';

const values = (over: Partial<FormFieldValues> = {}): FormFieldValues => ({
  name: 'ישראל ישראלי',
  code: '12345',
  kollel: 'כולל אברכים',
  issue: 'ר"מ',
  parshiot: 4,
  weeks: 3,
  payment: 'נדרים פלוס',
  pilpula: false,
  ...over,
});

async function documentXml(blob: Blob): Promise<string> {
  const entries = await readZipFromBlob(blob);
  const doc = entries.find((e) => e.name === 'word/document.xml')!;
  return doc.text!;
}

describe('toGematria', () => {
  it('ממיר מספרי גליונות נפוצים', () => {
    expect(toGematria(239)).toBe('רל"ט');
    expect(toGematria(240)).toBe('ר"מ');
    expect(toGematria(241)).toBe('רמ"א');
    expect(toGematria(242)).toBe('רמ"ב');
  });

  it('מוסיף גרש למספר בעל אות אחת', () => {
    expect(toGematria(1)).toBe("א'");
    expect(toGematria(10)).toBe("י'");
    expect(toGematria(100)).toBe("ק'");
    expect(toGematria(400)).toBe("ת'");
  });

  it('מוסיף גרשיים לפני האות האחרונה', () => {
    expect(toGematria(11)).toBe('י"א');
    expect(toGematria(21)).toBe('כ"א');
    expect(toGematria(101)).toBe('ק"א');
  });

  it('כותב 15 ו-16 כטו/טז (לא כשם ה\')', () => {
    expect(toGematria(15)).toBe('ט"ו');
    expect(toGematria(16)).toBe('ט"ז');
    expect(toGematria(115)).toBe('קט"ו');
    expect(toGematria(216)).toBe('רט"ז');
  });

  it('מפרק מאות מעל 400 לכפולות של ת', () => {
    expect(toGematria(500)).toBe('ת"ק');
    expect(toGematria(900)).toBe('תת"ק');
    expect(toGematria(999)).toBe('תתקצ"ט');
  });

  it('מטפל בעשרות ויחידות', () => {
    expect(toGematria(30)).toBe("ל'");
    expect(toGematria(99)).toBe('צ"ט');
    expect(toGematria(250)).toBe('ר"נ');
  });

  it('מחזיר את המספר עצמו לקלט לא חוקי', () => {
    expect(toGematria(0)).toBe('0');
    expect(toGematria(-5)).toBe('-5');
    expect(toGematria(Number.NaN)).toBe('NaN');
    expect(toGematria(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });
});

describe('buildAnswerFormDocx', () => {
  it('ממלא את כל הטוקנים בתבנית', async () => {
    const xml = await documentXml(buildAnswerFormDocx(values()));
    expect(xml).not.toMatch(/\{\{[A-Z]+\}\}/);
    expect(xml).toContain('ישראל ישראלי');
    expect(xml).toContain('12345');
    expect(xml).toContain('כולל אברכים');
    expect(xml).toContain('ר"מ');
    expect(xml).toContain('נדרים פלוס');
  });

  it('מסמן פלפולא לפי הבחירה', async () => {
    expect(await documentXml(buildAnswerFormDocx(values({ pilpula: true })))).toContain('☒ כן');
    expect(await documentXml(buildAnswerFormDocx(values({ pilpula: false })))).toContain('☐ כן');
  });

  it('מסמן תמיד "נענו תשובות"', async () => {
    expect(await documentXml(buildAnswerFormDocx(values()))).toContain('☒');
  });

  it('ממיר מספרים למחרוזות (פרשיות/שבועות)', async () => {
    const xml = await documentXml(buildAnswerFormDocx(values({ parshiot: 5, weeks: '2' })));
    expect(xml).toContain('>5<');
    expect(xml).toContain('>2<');
  });

  it('שדות ריקים אינם משאירים טוקנים', async () => {
    const xml = await documentXml(
      buildAnswerFormDocx({
        name: '',
        code: '',
        kollel: '',
        issue: '',
        parshiot: '',
        weeks: '',
        payment: '',
        pilpula: false,
      }),
    );
    expect(xml).not.toMatch(/\{\{[A-Z]+\}\}/);
  });

  it('מקודד תווי XML בערכי המשתמש', async () => {
    const xml = await documentXml(buildAnswerFormDocx(values({ name: 'א & <ב>' })));
    expect(xml).toContain('א &amp; &lt;ב&gt;');
  });

  it('משמר את כל חלקי התבנית ואת הדחיסה המקורית', async () => {
    const entries = await readZipFromBlob(buildAnswerFormDocx(values()));
    expect(entries.length).toBeGreaterThan(15);
    expect(entries.map((e) => e.name)).toContain('word/styles.xml');
    expect(entries.map((e) => e.name)).toContain('docProps/app.xml');
    const styles = entries.find((e) => e.name === 'word/styles.xml')!;
    expect(styles.method).toBe(8); // נשאר דחוס byte-for-byte
    const doc = entries.find((e) => e.name === 'word/document.xml')!;
    expect(doc.method).toBe(0);
  });

  it('מעדכן CRC וגדלים של document.xml שנכתב מחדש', async () => {
    const entries = await readZipFromBlob(buildAnswerFormDocx(values()));
    const doc = entries.find((e) => e.name === 'word/document.xml')!;
    expect(doc.crc).toBe(crc32(doc.data));
    expect(doc.compSize).toBe(doc.data.length);
    expect(doc.uncompSize).toBe(doc.data.length);
  });

  it('מחזיר Blob עם MIME של docx', () => {
    const blob = buildAnswerFormDocx(values());
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('קריאות חוזרות אינן מזהמות את התבנית (פלט זהה)', async () => {
    const first = await documentXml(buildAnswerFormDocx(values({ name: 'ראשון' })));
    const second = await documentXml(buildAnswerFormDocx(values({ name: 'שני' })));
    expect(first).toContain('ראשון');
    expect(second).toContain('שני');
    expect(second).not.toContain('ראשון');
  });
});
