// מילוי "טופס סימון תשובות" (docx): מחליף טוקנים ב-word/document.xml ומחזיר Blob.
//
// התבנית (answer-form.docx) מוטמעת כ-base64 (ראה docxBase64 ב-vite.config.ts).
// בתבנית, ערכי הדוגמה הומרו מראש לטוקנים ({{NAME}} וכו') — ראה scripts/tokenize.
// word/document.xml מאוחסן בתבנית ללא דחיסה (store), כך שבזמן ריצה אין צורך בפענוח
// deflate: קוראים את הטקסט, מחליפים טוקנים, וכותבים מחדש. שאר חלקי ה-docx מועתקים
// כפי שהם (byte-for-byte), כולל הדחיסה המקורית.

import { escapeXml } from './ooxml';
import templateB64 from './templates/answer-form.docx';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCUMENT_PART = 'word/document.xml';

export interface FormFieldValues {
  name: string;
  code: string;
  kollel: string;
  /** מספר הגליון בגימטריה, למשל "רמ\"א" */
  issue: string;
  /** מספר פרשיות לגליון */
  parshiot: number | string;
  /** מספר שבועות שנענו */
  weeks: number | string;
  /** צורת התשלום */
  payment: string;
  /** האם נענו תשובות לפלפולא */
  pilpula: boolean;
}

// ── CRC32 ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(d: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC_TABLE[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── קריאה/כתיבה של ZIP ──
interface ZipEntry {
  name: string;
  method: number;
  crc: number;
  compSize: number;
  uncompSize: number;
  /** הבייטים כפי שהם מאוחסנים בארכיון (דחוסים אם method!==0) */
  data: Uint8Array;
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const asciiDecoder = new TextDecoder('utf-8');

/** קורא ZIP דרך ה-Central Directory (התומך גם בקבצים דחוסים). */
function readZip(buf: Uint8Array): ZipEntry[] {
  // איתור End Of Central Directory (סריקה מהסוף)
  let p = buf.length - 22;
  while (p >= 0 && !(buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 0x05 && buf[p + 3] === 0x06)) {
    p--;
  }
  if (p < 0) throw new Error('EOCD לא נמצא — קובץ ZIP לא תקין');
  const total = u16(buf, p + 10);
  let o = u32(buf, p + 16); // היסט תחילת ה-Central Directory

  const entries: ZipEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (!(buf[o] === 0x50 && buf[o + 1] === 0x4b && buf[o + 2] === 0x01 && buf[o + 3] === 0x02)) {
      throw new Error('רשומת Central Directory לא תקינה');
    }
    const method = u16(buf, o + 10);
    const crc = u32(buf, o + 16);
    const compSize = u32(buf, o + 20);
    const uncompSize = u32(buf, o + 24);
    const nameLen = u16(buf, o + 28);
    const extraLen = u16(buf, o + 30);
    const commentLen = u16(buf, o + 32);
    const localOff = u32(buf, o + 42);
    const name = asciiDecoder.decode(buf.subarray(o + 46, o + 46 + nameLen));
    // תחילת הנתונים נקבעת לפי ה-Local Header (אורכי השם/extra עשויים להיות שונים)
    const lNameLen = u16(buf, localOff + 26);
    const lExtraLen = u16(buf, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    entries.push({ name, method, crc, compSize, uncompSize, data });
    o += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const u16b = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const u32b = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, x) => s + x.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const x of parts) {
    out.set(x, p);
    p += x.length;
  }
  return out;
}

/** כותב ZIP מרשומות (משמר method/crc/data של רשומות שלא שונו). */
function writeZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, ...u16b(e.method), 0, 0, 0, 0,
      ...u32b(e.crc), ...u32b(e.compSize), ...u32b(e.uncompSize), ...u16b(nameBytes.length), 0, 0,
    ]);
    const cd = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, ...u16b(e.method), 0, 0, 0, 0,
      ...u32b(e.crc), ...u32b(e.compSize), ...u32b(e.uncompSize), ...u16b(nameBytes.length),
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32b(off),
    ]);
    const entry = concat([local, nameBytes, e.data]);
    parts.push(entry);
    central.push(concat([cd, nameBytes]));
    off += entry.length;
  }
  const cdBuf = concat(central);
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0,
    ...u16b(entries.length), ...u16b(entries.length), ...u32b(cdBuf.length), ...u32b(off), 0, 0,
  ]);
  return concat([...parts, cdBuf, eocd]);
}

function fillTokens(xml: string, v: FormFieldValues): string {
  const map: Record<string, string> = {
    NAME: v.name || '',
    CODE: v.code || '',
    KOLLEL: v.kollel || '',
    ISSUE: String(v.issue ?? ''),
    PARSHIOT: String(v.parshiot ?? ''),
    WEEKS: String(v.weeks ?? ''),
    PAYMENT: v.payment || '',
    ANSWERED: '☒', // ☒
    PILPULA: v.pilpula ? '☒ כן      ☐ לא.' : '☐ כן      ☒ לא.',
  };
  return xml.replace(/\{\{([A-Z]+)\}\}/g, (full, key: string) =>
    key in map ? escapeXml(map[key]) : full,
  );
}

/** ממלא את טופס סימון התשובות ומחזיר Blob של docx. */
export function buildAnswerFormDocx(values: FormFieldValues): Blob {
  const entries = readZip(base64ToBytes(templateB64));
  const doc = entries.find((e) => e.name === DOCUMENT_PART);
  if (!doc) throw new Error(`${DOCUMENT_PART} לא נמצא בתבנית`);
  if (doc.method !== 0) {
    throw new Error('document.xml בתבנית אמור להיות מאוחסן ללא דחיסה (store)');
  }
  const xml = asciiDecoder.decode(doc.data);
  const filled = new TextEncoder().encode(fillTokens(xml, values));
  doc.data = filled;
  doc.compSize = filled.length;
  doc.uncompSize = filled.length;
  doc.crc = crc32(filled);
  return new Blob([writeZip(entries).slice()], { type: DOCX_MIME });
}

/** ממיר מספר שלם לגימטריה (לטווח מספרי הגליונות). משתמש בגרשיים ASCII כמו בטופס. */
export function toGematria(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  const parts: string[] = [];
  let h = Math.floor(n / 100);
  let rest = n % 100;
  while (h > 0) {
    if (h >= 4) {
      parts.push('ת');
      h -= 4;
    } else {
      parts.push(hundreds[h]);
      h = 0;
    }
  }
  const t = Math.floor(rest / 10);
  const u = rest % 10;
  if (t === 1 && (u === 5 || u === 6)) {
    // 15→טו, 16→טז (כדי לא לכתוב שם ה'/ו')
    parts.push('ט', units[u]);
  } else {
    if (t) parts.push(tens[t]);
    if (u) parts.push(units[u]);
  }
  const letters = parts.join('');
  if (letters.length <= 1) return letters + "'";
  return letters.slice(0, -1) + '"' + letters.slice(-1);
}
