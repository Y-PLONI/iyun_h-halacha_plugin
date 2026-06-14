// המרת קבצי המבחן (DOCX) ל-HTML מנוקה, מפוצל לפי שבוע, ובנייתו ל-public/data/exams/issue-XXXX.json.
// מריצים: npm run convert-exams. ה-DOCX נשמרים ב-exams-src/ (לא נארזים), הפלט נארז בתוסף.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import mammoth from 'mammoth';

const SRC_DIR = 'exams-src';
const OUT_DIR = 'public/data/exams';

interface ExamWeekDoc {
  weekNumber: number;
  parasha: string;
  title: string;
  sourceRangeTitle: string;
  html: string;
}
interface ExamDoc {
  schemaVersion: 1;
  issueId: string;
  issueTitle: string;
  hebrewMonth: string;
  sourceFile: string;
  weeks: ExamWeekDoc[];
}

const HEB = 'א-ת';
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** מחלץ טקסט פסקאות מתוך ה-HTML של mammoth (רק <p>, עם <strong> פנימי). */
function extractParas(html: string): string[] {
  return [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim(),
  );
}

const isMarker = (t: string) => /\(\s*שבוע\s+(\d+)\s+מתוך\s+\d+\s*\)/.exec(t);
const isSeparator = (t: string) => /^-{5,}$/.test(t.replace(/\s/g, ''));
const isFormField = (t: string) => /^שם\s*:?$/.test(t) || /^קוד\s*אישי/.test(t) || /^בס["׳']?ד/.test(t);
const isWeekTitle = (t: string) => /^שבוע\s+פרשת/.test(t);
const isQuestion = (t: string) => new RegExp(`^[${HEB}]\\]`).test(t);

function buildWeek(weekNumber: number, paras: string[]): ExamWeekDoc {
  let parasha = '';
  let title = '';
  let sourceRangeTitle = '';
  const bodyParts: string[] = [];
  let seenTitle = false;

  for (const raw of paras) {
    const t = raw.trim();
    if (!t || isMarker(t) || isSeparator(t) || isFormField(t)) continue;
    if (isWeekTitle(t)) {
      const rest = t.replace(/^שבוע\s+פרשת\s+/, '');
      const segs = rest.split(/\s+-\s+/);
      parasha = (segs.shift() ?? '').trim();
      title = segs.join(' - ').trim();
      seenTitle = true;
      continue;
    }
    // הפסקה שמיד אחרי כותרת השבוע = טווח הסימנים
    if (seenTitle && !sourceRangeTitle && !isQuestion(t)) {
      sourceRangeTitle = t;
      continue;
    }
    if (isQuestion(t)) {
      const letter = t.slice(0, t.indexOf(']') + 1);
      const restText = t.slice(t.indexOf(']') + 1).trim();
      bodyParts.push(`<p class="exam-q"><span class="exam-q-letter">${esc(letter)}</span> ${esc(restText)}</p>`);
    } else {
      bodyParts.push(`<p class="exam-sub">${esc(t)}</p>`);
    }
  }

  const html =
    (sourceRangeTitle ? `<p class="exam-range">${esc(sourceRangeTitle)}</p>` : '') +
    bodyParts.join('\n');
  return { weekNumber, parasha, title, sourceRangeTitle, html };
}

async function convertFile(file: string): Promise<ExamDoc> {
  const issueId = basename(file, '.docx');
  const { value: html } = await mammoth.convertToHtml({ path: join(SRC_DIR, file) });
  const paras = extractParas(html);

  // preamble: מה שלפני המרקר הראשון
  const firstMarker = paras.findIndex((t) => isMarker(t));
  const preamble = firstMarker >= 0 ? paras.slice(0, firstMarker) : paras;
  const titleLine = preamble.find((t) => t.includes('גליון')) ?? '';
  const titleIdx = preamble.indexOf(titleLine);
  const hebrewMonth = titleIdx >= 0 && preamble[titleIdx + 1] && !isFormField(preamble[titleIdx + 1])
    ? preamble[titleIdx + 1]
    : '';

  // פיצול לפי מרקרים "(שבוע N מתוך M)"
  const markers: { idx: number; weekNumber: number }[] = [];
  paras.forEach((t, idx) => {
    const m = isMarker(t);
    if (m) markers.push({ idx, weekNumber: Number(m[1]) });
  });

  const weeks: ExamWeekDoc[] = markers.map((mk, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].idx : paras.length;
    return buildWeek(mk.weekNumber, paras.slice(mk.idx, end));
  });

  return {
    schemaVersion: 1,
    issueId,
    issueTitle: titleLine || issueId,
    hebrewMonth,
    sourceFile: file,
    weeks,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'));
  if (!files.length) {
    console.warn(`אין קבצי DOCX ב-${SRC_DIR}/`);
    return;
  }
  for (const file of files) {
    const doc = await convertFile(file);
    const out = join(OUT_DIR, `${doc.issueId}.json`);
    writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    console.log(`✓ ${file} → ${out} (${doc.weeks.length} שבועות: ${doc.weeks.map((w) => w.parasha).join(', ')})`);
  }
}

void main();
