// פירוק ה-HTML של מסמך מבחן (פלט mammoth) ל-ExamDoc מפוצל לפי שבוע.
// פונקציות טהורות (ללא DOM/fs) — רצות גם בדפדפן וגם ב-Node.

import type { ExamDoc, ExamWeekDoc } from './types';

const HEB = 'א-ת';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** מחלץ טקסט פסקאות מתוך ה-HTML של mammoth (רק <p>, עם <strong> פנימי). */
function extractParas(html: string): string[] {
  return [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((m) =>
    m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

const isMarker = (t: string) => /\(\s*שבוע\s+(\d+)\s+מתוך\s+\d+\s*\)/.exec(t);
const isSeparator = (t: string) => /^-{5,}$/.test(t.replace(/\s/g, ''));
const isFormField = (t: string) => /^שם\s*:?$/.test(t) || /^קוד\s*אישי/.test(t) || /^בס["׳']?ד/.test(t);
const isWeekTitle = (t: string) => /^שבוע\s+פרשת/.test(t);
// שאלה: "א]" (גליון ר"מ) או "[א]" (גליון רל"ט)
const Q_RE = new RegExp(`^\\s*\\[?([${HEB}])\\]\\s*`);
const isQuestion = (t: string) => Q_RE.test(t);
// טווח סימנים: "מסימן ... עד ..." (ללא \\b — לא עובד עם עברית ב-regex לא-unicode)
const isRange = (t: string) => /^מסימן\s/.test(t) || /^מסי['׳]/.test(t);

function buildWeek(weekNumber: number, rawParas: string[]): ExamWeekDoc {
  const paras = rawParas
    .map((t) => t.trim())
    .filter((t) => t && !isMarker(t) && !isSeparator(t) && !isFormField(t));

  const titleStart = Math.max(0, paras.findIndex(isWeekTitle));
  const rangeIdx = paras.findIndex((t, i) => i > titleStart && isRange(t));
  const firstQIdx = paras.findIndex((t, i) => i > titleStart && isQuestion(t));
  const titleEndCands = [rangeIdx, firstQIdx].filter((x) => x >= 0);
  const titleEnd = titleEndCands.length ? Math.min(...titleEndCands) : titleStart + 1;

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
      // הכותרת המודגשת היא רק הנושא; תת-השאלה הראשונה ("א, ...") יורדת לשורה משלה
      // ואינה מודגשת — בדיוק כשאר תת-השאלות (ב, ג ...) שמגיעות כפסקאות נפרדות.
      const split = new RegExp(`^(.+?)\\s+-\\s+([${HEB}]\\s*,[\\s\\S]*)$`).exec(rest);
      const title = split ? split[1].trim() : rest;
      bodyParts.push(`<p class="exam-q"><span class="exam-q-letter">${esc(m[1])}]</span> ${esc(title)}</p>`);
      if (split) bodyParts.push(`<p class="exam-sub">${esc(split[2].trim())}</p>`);
    } else {
      bodyParts.push(`<p class="exam-sub">${esc(t)}</p>`);
    }
  }

  return { weekNumber, headerText, sourceRangeTitle, html: bodyParts.join('\n') };
}

/** ממיר את ה-HTML של mammoth ל-ExamDoc (כותרת גליון + שבועות). */
export function parseExamHtml(issueId: string, html: string): ExamDoc {
  const paras = extractParas(html);

  const firstMarker = paras.findIndex((t) => isMarker(t));
  const preamble = firstMarker >= 0 ? paras.slice(0, firstMarker) : paras;
  const titleLine = preamble.find((t) => t.includes('גליון')) ?? '';
  const titleIdx = preamble.indexOf(titleLine);
  const hebrewMonth =
    titleIdx >= 0 && preamble[titleIdx + 1] && !isFormField(preamble[titleIdx + 1]) ? preamble[titleIdx + 1] : '';

  const markers: { idx: number; weekNumber: number }[] = [];
  paras.forEach((t, idx) => {
    const m = isMarker(t);
    if (m) markers.push({ idx, weekNumber: Number(m[1]) });
  });

  const weeks: ExamWeekDoc[] = markers.map((mk, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].idx : paras.length;
    return buildWeek(mk.weekNumber, paras.slice(mk.idx, end));
  });

  return { schemaVersion: 1, issueId, issueTitle: titleLine || issueId, hebrewMonth, sourceFile: `${issueId}.docx`, weeks };
}
