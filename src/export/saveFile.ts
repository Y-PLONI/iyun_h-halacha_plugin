// שמירת קובץ שנוצר בדף אל המחשב של המשתמש.
//
// ב-WebView של אוצריא הורדת `blob:` דרך <a download> אינה שומרת קובץ בפועל (אין הודעת שגיאה,
// והקובץ פשוט לא מופיע). לכן בתוך אוצריא משתמשים במסלול הרשמי: fs.beginBinaryWrite → PUT של
// הבייטים לשרת ה-loopback → fs.commitUserFileWrite, שפותח דיאלוג "שמור בשם" ומחזיר אישור אמיתי.
// מחוץ לאוצריא (דפדפן/פיתוח) נשארים עם <a download>.

import { callOtzaria, hasOtzaria } from '../otzaria/sdk';

export type SaveStatus = 'saved' | 'downloaded' | 'cancelled';

export interface SaveOutcome {
  /** שם הקובץ בפועל (כפי שנשמר, אם ה-host החזיר שם; אחרת השם המוצע) */
  filename: string;
  /**
   * saved — ה-host אישר שמירה לקובץ שבחר המשתמש.
   * downloaded — הורדה דרך הדפדפן (לא ניתן לאמת שהקובץ נשמר).
   * cancelled — המשתמש ביטל את דיאלוג השמירה.
   */
  status: SaveStatus;
}

/** הורדה קלאסית דרך <a download> (דפדפן / סביבת פיתוח). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface BeginWriteData {
  writeToken: string;
  uploadUrl: string;
}

interface CommitData {
  cancelled?: boolean;
  name?: string;
}

function splitName(filename: string): { base: string; ext: string } {
  const m = /^(.*)\.([A-Za-z0-9]{1,10})$/.exec(filename);
  return m ? { base: m[1], ext: m[2] } : { base: filename, ext: '' };
}

/**
 * שומר את הקובץ. בתוך אוצריא — דיאלוג "שמור בשם"; אם המסלול אינו זמין (גרסה ישנה, חסרה
 * הרשאה) — נופל להורדה דרך הדפדפן. שגיאה אחרי שההעלאה התחילה נזרקת (בלי נפילה שקטה).
 *
 * חשוב: יש לקרוא לפונקציה כמה שיותר קרוב ללחיצת המשתמש, בלי שרשרת await ארוכה לפניה.
 */
export async function saveBlobAs(blob: Blob, filename: string, dialogTitle?: string): Promise<SaveOutcome> {
  if (!hasOtzaria()) {
    downloadBlob(blob, filename);
    return { filename, status: 'downloaded' };
  }

  let begin: BeginWriteData;
  try {
    begin = await callOtzaria<BeginWriteData>('fs.beginBinaryWrite', {
      purpose: 'user-file',
      expectedSize: blob.size,
    });
    if (!begin?.writeToken || !begin.uploadUrl) throw new Error('error.invalid_response');
  } catch {
    // המסלול אינו נתמך/מורשה בגרסה הזו — נפילה להורדה דרך הדפדפן
    downloadBlob(blob, filename);
    return { filename, status: 'downloaded' };
  }

  try {
    const res = await fetch(begin.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    if (!res.ok) throw new Error(`העלאה נכשלה (${res.status})`);

    const { base, ext } = splitName(filename);
    const commit = await callOtzaria<CommitData>('fs.commitUserFileWrite', {
      writeToken: begin.writeToken,
      suggestedName: base,
      ...(ext ? { extension: ext } : {}),
      ...(dialogTitle ? { title: dialogTitle } : {}),
    });
    if (commit?.cancelled) return { filename, status: 'cancelled' };
    return { filename: commit?.name || filename, status: 'saved' };
  } catch (e) {
    // משחררים את ההעלאה התפוסה (אידמפוטנטי); כשל בשחרור אינו חשוב
    try {
      await callOtzaria('fs.abortBinaryWrite', { writeToken: begin.writeToken });
    } catch {
      /* התעלמות */
    }
    throw e;
  }
}

/** הודעת toast למשתמש לפי תוצאת השמירה (בלי להניח שהקובץ ירד כשלא אומת). */
export function describeOutcome(o: SaveOutcome): string {
  if (o.status === 'saved') return `הקובץ נשמר: ${o.filename}`;
  if (o.status === 'cancelled') return 'השמירה בוטלה';
  return `${o.filename} ירד למחשב`;
}
