// המרת HTML ל-OOXML עם RTL נכון, ובניית חבילת DOCX מכווצת (ZIP ללא דחיסה).
// הלוגיקה מבוססת על word_plugin_1.2.9/js/export.js, נכתבה מחדש ב-TypeScript נקי.

const NW = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NR = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NC = 'http://schemas.openxmlformats.org/package/2006/content-types';
const NO = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export function escapeXml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

/** המרת HTML מנוקה (p/strong/em/u/ol/ul/li/blockquote/br) ל-OOXML body. */
export function htmlToOoxml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function runs(node: Node, extra = ''): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? '';
      if (!t) return '';
      const rpr = `<w:rPr><w:rFonts w:cs="David" w:hint="cs"/>${extra}<w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>`;
      return `<w:r>${rpr}<w:t xml:space="preserve">${escapeXml(t)}</w:t></w:r>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    let add = extra;
    if (tag === 'strong' || tag === 'b') add += '<w:b/><w:bCs/>';
    if (tag === 'em' || tag === 'i') add += '<w:i/><w:iCs/>';
    if (tag === 'u') add += '<w:u w:val="single"/>';
    return Array.from(el.childNodes)
      .map((c) => runs(c, add))
      .join('');
  }

  function para(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').trim();
      if (!t) return '';
      return `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:cs="David" w:hint="cs"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr><w:t xml:space="preserve">${escapeXml(t)}</w:t></w:r></w:p>`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const pBase = `<w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>`;

    if (tag === 'br') return `<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
    if (tag === 'ul' || tag === 'ol') {
      return Array.from(el.querySelectorAll('li'))
        .map(
          (li, i) =>
            `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:ind w:right="360"/></w:pPr><w:r><w:rPr><w:rFonts w:cs="David" w:hint="cs"/><w:rtl/></w:rPr><w:t xml:space="preserve">${tag === 'ol' ? `${i + 1}. ` : '• '}</w:t></w:r>${runs(li)}</w:p>`,
        )
        .join('');
    }
    const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote', 'br'];
    const kids = Array.from(el.childNodes);
    const hasBlock = kids.some(
      (k) => k.nodeType === Node.ELEMENT_NODE && blockTags.includes((k as HTMLElement).tagName.toLowerCase()),
    );
    const headings: Record<string, string> = { h1: 'Heading1', h2: 'Heading2', h3: 'Heading3' };
    if (headings[tag]) {
      return `<w:p><w:pPr><w:pStyle w:val="${headings[tag]}"/><w:bidi/><w:jc w:val="right"/></w:pPr>${runs(el)}</w:p>`;
    }
    if ((tag === 'div' || tag === 'blockquote' || tag === 'section') && hasBlock) {
      return kids.map(para).join('');
    }
    if (['p', 'h4', 'li', 'blockquote'].includes(tag) || !hasBlock) {
      return `<w:p>${pBase}${runs(el)}</w:p>`;
    }
    return kids.map(para).join('');
  }

  const result = Array.from(tmp.childNodes).map(para).join('');
  return result || `<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
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
  <w:themeFontLang w:val="he-IL" w:bidi="he-IL"/>
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
      <w:lang w:val="he-IL" w:bidi="he-IL"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:bidi/>
      <w:jc w:val="right"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
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
