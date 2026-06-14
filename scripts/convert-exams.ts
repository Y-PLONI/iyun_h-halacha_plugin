// המרת קבצי המבחן (DOCX) ל-HTML מנוקה, מפוצל לפי שבוע, ובנייתו ל-public/data/exams/issue-XXXX.json.
// מריצים: npm run convert-exams. ה-DOCX נשמרים ב-exams-src/ (לא נארזים), הפלט נארז בתוסף.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import mammoth from 'mammoth';

const SRC_DIR = 'exams-src';
const OUT_DIR = 'public/data/exams';

interface ExamWeekDoc {
  weekNumber: number;
  /** כותרת/נושא השבוע כפי שמופיע במסמך (פרשה + נושא), מנוקה. */
  headerText: string;
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
// שאלה: "א]" (גליון ר"מ) או "[א]" (גליון רל"ט) — אות עברית באות סוגרת ]
const Q_RE = new RegExp(`^\\s*\\[?([${HEB}])\\]\\s*`);
const isQuestion = (t: string) => Q_RE.test(t);
// טווח סימנים: "מסימן ... עד ..." (ללא \b — לא עובד עם עברית ב-regex לא-unicode)
const isRange = (t: string) => /^מסימן\s/.test(t) || /^מסי['׳]/.test(t);

function buildWeek(weekNumber: number, rawParas: string[]): ExamWeekDoc {
  // ניקוי: מסירים מרקר/מפריד/שדות-טופס/ריקים
  const paras = rawParas
    .map((t) => t.trim())
    .filter((t) => t && !isMarker(t) && !isSeparator(t) && !isFormField(t));

  const titleStart = Math.max(0, paras.findIndex(isWeekTitle));
  const rangeIdx = paras.findIndex((t, i) => i > titleStart && isRange(t));
  const firstQIdx = paras.findIndex((t, i) => i > titleStart && isQuestion(t));
  const titleEndCands = [rangeIdx, firstQIdx].filter((x) => x >= 0);
  const titleEnd = titleEndCands.length ? Math.min(...titleEndCands) : titleStart + 1;

  // כותרת/נושא — יכול להשתרע על כמה פסקאות (גליון רל"ט). מסירים "שבוע פרשת", מאחדים מפרידים.
  const headerText = paras
    .slice(titleStart, titleEnd)
    .join(' ')
    .replace(/^שבוע\s+פרשת\s+/, '')
    .replace(/\s*-\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .replace(/\s*·\s*$/, '')
    .trim();

  const sourceRangeTitle = rangeIdx >= 0 ? paras[rangeIdx] : '';
  const bodyStart = rangeIdx >= 0 ? rangeIdx + 1 : titleEnd;

  const bodyParts: string[] = [];
  for (const t of paras.slice(bodyStart)) {
    const m = Q_RE.exec(t);
    if (m) {
      const rest = t.slice(m[0].length).trim();
      bodyParts.push(`<p class="exam-q"><span class="exam-q-letter">${esc(m[1])}]</span> ${esc(rest)}</p>`);
    } else {
      bodyParts.push(`<p class="exam-sub">${esc(t)}</p>`);
    }
  }

  const html = bodyParts.join('\n');
  return { weekNumber, headerText, sourceRangeTitle, html };
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
    console.log(`✓ ${file} → ${out} (${doc.weeks.length} שבועות: ${doc.weeks.map((w) => w.headerText.split(' · ')[0]).join(', ')})`);
  }
}

void main();
