// המרת HTML ל-OOXML עם RTL נכון, ובניית חבילת DOCX מכווצת (ZIP ללא דחיסה).
// הלוגיקה מבוססת על word_plugin_1.2.9/js/export.js, נכתבה מחדש ב-TypeScript נקי.

const NW = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NR = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NC = 'http://schemas.openxmlformats.org/package/2006/content-types';
const NO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// שפת הטקסט בקובץ: כמו ב-Word עצמו (ר' תבנית answer-form.docx) — שפה לטינית en-US ושפת ה-bidi
// עברית. הצהרה של he-IL על הצד הלטיני מבלבלת את Word בבחירת שפת המקלדת והכיוון בעריכה.
const LANG = '<w:lang w:val="en-US" w:bidi="he-IL"/>';
// תכונות סימן-הפסקה: כך הסמן בפסקה ריקה/בסוף פסקה נשאר בעברית ובכיוון RTL.
const PMARK = runProps();

/**
 * תווים שאסורים ב-XML 1.0 (תווי בקרה מלבד טאב/שורה חדשה, ו-U+FFFE/U+FFFF). למשל VT (\v) מגיע
 * בהדבקת טקסט שהועתק מ-Word (שבירת שורה ידנית) — ובלי סינון Word מסרב לפתוח את הקובץ.
 */
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeXml(s: string): string {
  return String(s)
    .replace(XML_INVALID, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** ZIP builder ללא דחיסה (store). */
export function makeZip(files: { name: string; text: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const ct = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    ct[i] = c;
  }
  const crc32 = (d: Uint8Array): number => {
    let c = 0xffffffff;
    for (let i = 0; i < d.length; i++) c = ct[(c ^ d[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const cat = (...a: Uint8Array[]): Uint8Array => {
    const t = a.reduce((s, x) => s + x.length, 0);
    const o = new Uint8Array(t);
    let p = 0;
    for (const x of a) {
      o.set(x, p);
      p += x.length;
    }
    return o;
  };

  const parts: Uint8Array[] = [];
  const cds: Uint8Array[] = [];
  let off = 0;
  for (const { name, text } of files) {
    const nb = enc.encode(name);
    const db = enc.encode(text);
    const crc = crc32(db);
    const lh = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), 0, 0,
    ]);
    const cd = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length),
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off),
    ]);
    const entry = cat(lh, nb, db);
    parts.push(entry);
    cds.push(cat(cd, nb));
    off += entry.length;
  }
  const cdBuf = cat(...cds);
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0,
    ...u16(files.length), ...u16(files.length), ...u32(cdBuf.length), ...u32(off), 0, 0,
  ]);
  return cat(...parts, cdBuf, eocd);
}

/** עיצוב תווים שנצבר מתגיות HTML מקוננות. */
interface RunFmt {
  b?: boolean;
  i?: boolean;
  u?: boolean;
}

/**
 * מאפייני run (rPr) — תמיד באותו סדר של ה-schema (CT_RPr):
 * rFonts, b, bCs, i, iCs, u, rtl, lang. כך כל run (כולל קידומת תבליט/מספור) נושא גופן,
 * כיוון ושפה זהים, וקינון בסדר שונה (<u><b>) לא מייצר XML בסדר לא תקני או כפילויות.
 */
function runProps(fmt: RunFmt = {}): string {
  return (
    '<w:rPr><w:rFonts w:cs="David" w:hint="cs"/>' +
    (fmt.b ? '<w:b/><w:bCs/>' : '') +
    (fmt.i ? '<w:i/><w:iCs/>' : '') +
    (fmt.u ? '<w:u w:val="single"/>' : '') +
    `<w:rtl/>${LANG}</w:rPr>`
  );
}

function textRun(text: string, fmt?: RunFmt): string {
  return `<w:r>${runProps(fmt)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

/**
 * מאפייני פסקה (pPr) בסדר ה-schema (CT_PPr): pStyle, bidi, ind, rPr (אחרון).
 *
 * כיוון: בפסקת bidi, Word מפרש את left/right של jc ושל ind כצד ההתחלה/הסוף של הפסקה (ולא
 * כצד פיזי) — כך Word עצמו כותב הזחת רשימה עברית: <w:ind w:left="720" .../> (ר' exams-src).
 * לכן: בלי jc בכלל (ברירת המחדל בפסקת bidi היא יישור לצד ההתחלה = ימין, כמו בקבצי Word),
 * והזחה מצד ההתחלה (ימין) נכתבת ב-w:left.
 */
function paraProps(opts: { style?: string; indentStart?: number } = {}): string {
  return (
    '<w:pPr>' +
    (opts.style ? `<w:pStyle w:val="${opts.style}"/>` : '') +
    '<w:bidi/>' +
    (opts.indentStart ? `<w:ind w:left="${opts.indentStart}"/>` : '') +
    `${PMARK}</w:pPr>`
  );
}

/** הזחה (twips) לכל רמת קינון ברשימה. */
const LIST_INDENT = 360;
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SECTION']);
const LIST_TAGS = new Set(['UL', 'OL']);

/**
 * האם יש בטקסט תוכן שהדפדפן מציג. רק רווחים "רגילים" של HTML נחשבים ריקים — לא NBSP
 * (‎String.trim‎ מסיר גם אותו, אבל contentEditable מכניס NBSP כרווח גלוי).
 */
function hasText(s: string | null | undefined): boolean {
  return /[^ \t\n\r\f]/.test(s ?? '');
}

function isBlock(n: Node): boolean {
  return n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName);
}

/**
 * האם יש תוכן (טקסט או <br> נוסף) אחרי הצומת, בתוך אותו בלוק? <br> בלי תוכן אחריו הוא
 * "ממלא מקום" של contentEditable (שורה ריקה <p><br></p>, או "a<br><br>" אחרי Shift+Enter
 * בסוף שורה) — הוא לא שבירת שורה אמיתית. רשימות מקוננות אינן חלק מהפסקה הנוכחית.
 */
function hasContentAfter(node: Node, block: Node): boolean {
  for (let n: Node | null = node; n && n !== block; n = n.parentNode) {
    for (let s = n.nextSibling; s; s = s.nextSibling) {
      if (s.nodeType === Node.TEXT_NODE) {
        if (hasText(s.textContent)) return true;
      } else if (s.nodeType === Node.ELEMENT_NODE) {
        const e = s as Element;
        if (LIST_TAGS.has(e.tagName)) continue;
        if (e.tagName === 'BR' || hasText(e.textContent) || e.querySelector('br')) return true;
      }
    }
  }
  return false;
}

/** המרת HTML מנוקה (p/strong/em/u/ol/ul/li/blockquote/br) ל-OOXML body. */
export function htmlToOoxml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  /** runs של תוכן inline בתוך `block`. רשימות מקוננות מדולגות (הן פסקאות משלהן). */
  function runs(node: Node, block: Node, fmt: RunFmt = {}): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? '';
      return t ? textRun(t, fmt) : '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = (node as HTMLElement).tagName.toLowerCase();
    if (tag === 'br') {
      // Shift+Enter: שבירת שורה בתוך הפסקה, באותו עיצוב run
      return hasContentAfter(node, block) ? `<w:r>${runProps(fmt)}<w:br/></w:r>` : '';
    }
    if (tag === 'ul' || tag === 'ol') return '';
    const next: RunFmt = {
      b: fmt.b || tag === 'strong' || tag === 'b',
      i: fmt.i || tag === 'em' || tag === 'i',
      u: fmt.u || tag === 'u',
    };
    return Array.from(node.childNodes)
      .map((c) => runs(c, block, next))
      .join('');
  }

  const emptyPara = `<w:p>${paraProps()}</w:p>`;
  const plainPara = (el: Node) => `<w:p>${paraProps()}${runs(el, el)}</w:p>`;

  /**
   * רשימה: רק ילדים ישירים — כל li פסקה (קידומת + הטקסט שלו בלבד), ואחריה הרשימות המקוננות
   * שלו ברמת הזחה עמוקה יותר. רשימה שהיא ילד ישיר של ol/ul (כך Chrome מקנן ב"הגדל הזחה")
   * מוצגת כרמה מקוננת של הפריט הקודם.
   */
  function list(el: Element, level: number): string {
    const ordered = el.tagName === 'OL';
    let n = 0;
    return Array.from(el.children)
      .map((child) => {
        if (LIST_TAGS.has(child.tagName)) return list(child, level + 1);
        if (child.tagName !== 'LI') return '';
        n += 1;
        const prefix = textRun(ordered ? `${n}. ` : '• ');
        const own = `<w:p>${paraProps({ indentStart: LIST_INDENT * level })}${prefix}${runs(child, child)}</w:p>`;
        const nested = Array.from(child.querySelectorAll('ol, ul'))
          .filter((l) => l.parentElement?.closest('li, ol, ul') === child)
          .map((l) => list(l, level + 1))
          .join('');
        return own + nested;
      })
      .join('');
  }

  /**
   * רצף צמתים בתוך מכל: בלוקים מומרים כל אחד לפסקאות, וצמתי inline רצופים (טקסט, עיצוב, <br>)
   * מקובצים לפסקה אחת — כמו שהם מוצגים (למשל "a<br>b" בראש העורך הוא פסקה אחת עם שבירת שורה).
   */
  function blocks(nodes: Node[]): string {
    let out = '';
    let group: Node[] = [];
    const flush = () => {
      if (!group.length) return;
      const wrap = document.createElement('span');
      for (const g of group) wrap.appendChild(g.cloneNode(true));
      group = [];
      if (!hasText(wrap.textContent)) {
        // בלי טקסט: כל <br> בודד (מחוץ לפסקה) הוא שורה ריקה
        out += emptyPara.repeat(wrap.querySelectorAll('br').length);
        return;
      }
      const first = wrap.firstChild;
      const last = wrap.lastChild;
      if (first?.nodeType === Node.TEXT_NODE) first.textContent = (first.textContent ?? '').replace(/^[ \t\n\r\f]+/, '');
      if (last?.nodeType === Node.TEXT_NODE) last.textContent = (last.textContent ?? '').replace(/[ \t\n\r\f]+$/, '');
      out += plainPara(wrap);
    };
    for (const node of nodes) {
      if (isBlock(node)) {
        flush();
        out += para(node as Element);
      } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
        group.push(node);
      }
    }
    flush();
    return out;
  }

  function para(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') return list(el, 1);
    // בלוק בלי טקסט ובלי <br> (למשל <p></p> שנוצר מ-<div><div>x</div></div> אחרי המיפוי DIV→P)
    // גובהו 0 בעורך — לא מייצרים עבורו פסקה ריקה ב-Word. שורה ריקה אמיתית היא <p><br></p>.
    if (!hasText(el.textContent) && !el.querySelector('br')) return '';
    const kids = Array.from(el.childNodes);
    const headings: Record<string, string> = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3' };
    if (headings[tag]) {
      return `<w:p>${paraProps({ style: headings[tag] })}${runs(el, el)}</w:p>`;
    }
    // מכל שמכיל בלוקים: מפרקים לפסקאות (inline רצוף ביניהם — פסקה אחת)
    if (kids.some(isBlock)) return blocks(kids);
    return plainPara(el);
  }

  return blocks(Array.from(tmp.childNodes)) || emptyPara;
}

/** עוטף body מסוג OOXML לחבילת DOCX מלאה ומחזיר Blob. */
export function packageDocx(bodyXml: string): Blob {
  const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${NC}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NR}">
  <Relationship Id="rId1" Type="${NO}/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const WRELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NR}">
  <Relationship Id="rId1" Type="${NO}/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="${NO}/settings" Target="settings.xml"/>
</Relationships>`;

  const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${NW}">
  <w:defaultTabStop w:val="720"/>
  <w:themeFontLang w:val="en-US" w:bidi="he-IL"/>
  <w:bidi/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${NW}">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="David"/>
      <w:rtl/>
      <w:lang w:val="en-US" w:bidi="he-IL"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:bidi/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:bidi/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:rtl/>${LANG}</w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:color w:val="1F3763"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:rtl/></w:rPr>
  </w:style>
</w:styles>`;

  const DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="${NW}"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:body>${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>
      <w:bidi/>
      <w:rtlGutter/>
      <w:docGrid w:type="lines" w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip = makeZip([
    { name: '[Content_Types].xml', text: CT },
    { name: '_rels/.rels', text: RELS },
    { name: 'word/document.xml', text: DOC },
    { name: 'word/_rels/document.xml.rels', text: WRELS },
    { name: 'word/styles.xml', text: STYLES },
    { name: 'word/settings.xml', text: SETTINGS },
  ]);
  // עותק מתוך ה-ArrayBuffer כדי לקבל Blob תקין
  return new Blob([zip.slice()], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
