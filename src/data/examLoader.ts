// טעינת מסמכי המבחן ישירות מקבצי ה-Word (exams-src/*.docx), בזמן ריצה.
// הקבצים מוטמעים ב-bundle כ-base64 (ראה docxBase64 ב-vite.config.ts), מומרים ל-HTML
// עם mammoth, ומפוצלים לפי שבוע. אין קבצי JSON ביניים — ה-Word הוא מקור האמת.
//
// הוספת גליון: שמור exams-src/issue-XXXX.docx והרץ build. אין צורך לערוך קוד —
// import.meta.glob מגלה את כל קבצי ה-docx אוטומטית.

// הבנייה העצמאית לדפדפן (browserify) — מכילה את כל התלויות (jszip וכו') ושימי
// Buffer/process פנימיים, כך שאינה תלויה ב-globals של Node. זו אותה בנייה שתוסף
// ה-Word משתמש בה בהצלחה ב-WebView של אוצריא.
import mammoth from 'mammoth/mammoth.browser.min.js';
import type { ExamDoc, ExamWeekDoc, ScheduleWeek } from './types';
import { parseExamHtml } from './examParse';

// כל קבצי ה-docx, מוטמעים כ-base64 (גילוי אוטומטי).
const docxModules = import.meta.glob('../../exams-src/*.docx', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const examByIssue: Record<string, ExamDoc> = {};
let loaded = false;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function issueIdFromPath(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.docx$/i, '');
}

/** ממיר את כל מסמכי ה-Word ל-ExamDoc. נקרא פעם אחת ב-boot. */
export async function loadExams(): Promise<void> {
  if (loaded) return;
  await Promise.all(
    Object.entries(docxModules).map(async ([path, b64]) => {
      const issueId = issueIdFromPath(path);
      try {
        const { value } = await mammoth.convertToHtml({ arrayBuffer: base64ToBytes(b64).buffer as ArrayBuffer });
        examByIssue[issueId] = parseExamHtml(issueId, value);
      } catch (e) {
        console.error(`[exams] המרת ${issueId} נכשלה`, e);
      }
    }),
  );
  loaded = true;
}

/** ממיר מסמכי docx מרוחקים (base64, מ-GitHub) וממזג/דורס לפי issueId. */
export async function applyRemoteExams(examsBase64: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(examsBase64).map(async ([issueId, b64]) => {
      try {
        const { value } = await mammoth.convertToHtml({ arrayBuffer: base64ToBytes(b64).buffer as ArrayBuffer });
        examByIssue[issueId] = parseExamHtml(issueId, value);
      } catch (e) {
        console.error(`[exams] המרת גליון מרוחק ${issueId} נכשלה`, e);
      }
    }),
  );
}

/** מסמך המבחן (Word→HTML) של גליון. */
export function getExamDoc(issueId: string): ExamDoc | null {
  return examByIssue[issueId] ?? null;
}

/** מסמך המבחן של שבוע נתון (לפי weekNumber בתוך הגליון). */
export function getExamWeek(week: ScheduleWeek): ExamWeekDoc | null {
  const doc = getExamDoc(week.issueId);
  if (!doc) return null;
  return doc.weeks.find((w) => w.weekNumber === week.weekNumber) ?? null;
}
