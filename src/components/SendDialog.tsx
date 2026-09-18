// דיאלוג מילוי לפני שליחה: ממלא אוטומטית מה שידוע (שם, קוד, גליון, פרשיות, שבועות
// שנענו), ומאפשר להשלים/לאשר את שאר השדות (כולל, צורת תשלום, פלפולא). בעת שליחה:
// מייצא את קובץ התשובות של כל הגליון + טופס סימון התשובות הממולא לתיקיית ההורדות,
// ופותח מייל. התשובות נשלחות בקובץ אחד, בהתאם לדרישת המערכת.

import { useMemo, useState } from 'react';
import type { ExamEntry, ScheduleWeek } from '../data/types';
import { useSettings, updateSettings } from '../state/settingsStore';
import { getWeeksForIssue } from '../data/localData';
import { getAnswer, saveAnswersNow } from '../state/answersStore';
import { exportIssueDocx, downloadBlob } from '../export/docx';
import { buildAnswerFormDocx, toGematria, type FormFieldValues } from '../export/formDocx';
import { sendMail } from '../otzaria/mail';
import { toast } from './Toast';
import { Icon } from './Icon';

interface Props {
  week: ScheduleWeek;
  exam: ExamEntry | null;
  onClose: () => void;
}

/** מספר הגליון בגימטריה — מתוך כותרת הגליון אם קיימת, אחרת מחושב. */
function issueGematria(exam: ExamEntry | null): string {
  const m = exam?.title?.match(/גליון\s+(.+?)\s*$/);
  if (m) return m[1].trim();
  return exam ? toGematria(exam.issueNumber) : '';
}

export function SendDialog({ week, exam, onClose }: Props) {
  const settings = useSettings();
  const todayLabel = new Date().toLocaleDateString('he-IL');

  // שבועות הגליון — מקור גם לספירת "שבועות שנענו" וגם לקובץ התשובות המצורף
  const issueWeeks = useMemo(() => (exam ? getWeeksForIssue(exam.issueId) : [week]), [exam, week]);

  // ספירת שבועות שנענו (סטטוס "הושלם") בגליון
  const completedWeeks = useMemo(
    () => issueWeeks.filter((w) => getAnswer(w.weekId)?.status === 'completed').length,
    [issueWeeks],
  );

  const parshiotCount = exam?.parshiot?.length ?? exam?.weeksInIssue ?? '';
  const gematria = issueGematria(exam);

  const [name, setName] = useState(settings.name);
  const [code, setCode] = useState(settings.personalCode);
  const [kollel, setKollel] = useState(settings.kollel);
  const [payment, setPayment] = useState('');
  const [pilpula, setPilpula] = useState(false);
  const [weeks, setWeeks] = useState(String(completedWeeks || ''));
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      // שמירת הערכים הקבועים בהגדרות (כולל נשמר; שם/קוד מתעדכנים אם נערכו)
      updateSettings({ name: name.trim(), personalCode: code.trim(), kollel: kollel.trim() });
      await saveAnswersNow();

      // 1) קובץ התשובות — כל שבועות הגליון בקובץ אחד, כפי שנדרש לשליחה
      let answersFile = '';
      try {
        answersFile = exportIssueDocx(
          {
            weeks: issueWeeks,
            settings: { ...settings, name: name.trim(), personalCode: code.trim() },
            issueTitle: exam?.title ?? 'עיון ההלכה',
            hebrewMonth: exam?.hebrewMonth ?? '',
            dateLabel: todayLabel,
          },
          exam?.issueNumber ?? 0,
        );
      } catch (e) {
        toast('שגיאה בייצוא קובץ התשובות: ' + (e instanceof Error ? e.message : ''));
      }

      // 2) טופס סימון התשובות הממולא
      let formFile = '';
      try {
        const values: FormFieldValues = {
          name: name.trim(),
          code: code.trim(),
          kollel: kollel.trim(),
          issue: gematria,
          parshiot: parshiotCount,
          weeks: weeks.trim() || String(completedWeeks),
          payment: payment.trim(),
          pilpula,
        };
        const blob = buildAnswerFormDocx(values);
        formFile = `טופס סימון תשובות - גליון ${exam?.issueNumber ?? ''}.docx`;
        downloadBlob(blob, formFile);
      } catch (e) {
        toast('שגיאה בהפקת טופס הסימון: ' + (e instanceof Error ? e.message : ''));
      }

      // 3) פתיחת המייל
      const subject = [
        name.trim() || 'ללא שם',
        `קוד: ${code.trim() || '—'}`,
        `פרשת ${week.parasha}`,
        `גליון ${exam?.issueNumber ?? ''}`,
      ].join(' | ');

      const attachLines = [
        answersFile ? `• צרף את קובץ התשובות שירד לתיקיית ההורדות (${answersFile}).` : '',
        formFile ? `• צרף את טופס סימון התשובות שירד לתיקיית ההורדות (${formFile}).` : '',
      ].filter(Boolean);

      const body = [
        'שלום רב,',
        '',
        'מצורפות תשובותיי לעיון ההלכה.',
        '',
        'לצירוף:',
        ...attachLines,
        '',
        'לבקשת טופס סימון תשובות ריק: iyun1@iyun.co.il',
        '',
        name.trim() ? `בברכה,\n${name.trim()}` : 'בברכה,',
      ].join('\n');

      await sendMail({ to: settings.recipientEmail, subject, body });

      const downloaded = [answersFile, formFile].filter(Boolean).length;
      toast(
        downloaded
          ? `${downloaded} קבצים ירדו לתיקיית ההורדות — צרף אותם למייל שנפתח.`
          : 'נפתח חלון מייל.',
      );
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overlay-scrim" onClick={onClose}>
      <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>שליחת תשובות במייל</h2>
          <button className="icon-btn square" title="סגור" aria-label="סגור" onClick={onClose}>
            <Icon name="dismiss" />
          </button>
        </div>

        <p className="hint">
          הפרטים הידועים מולאו אוטומטית. השלם את החסר ולחץ "שלח" — קובץ התשובות (כל
          שבועות הגליון שנענו) וטופס סימון התשובות הממולא ירדו לתיקיית ההורדות, וייפתח
          חלון מייל לצירופם.
        </p>

        <div className="field">
          <label>שם פרטי ומשפחה</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>קוד אישי</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field">
          <label>כולל</label>
          <input className="input" value={kollel} onChange={(e) => setKollel(e.target.value)} />
        </div>
        <div className="field">
          <label>צורת התשלום על הגליון</label>
          <input
            className="input"
            value={payment}
            placeholder="לדוגמה: נדרים פלוס"
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>
        <div className="field">
          <label>מספר שבועות שנענו</label>
          <input
            className="input"
            type="number"
            min={0}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
          />
        </div>
        <label className="check-row">
          <input type="checkbox" checked={pilpula} onChange={(e) => setPilpula(e.target.checked)} />
          <span>נענו גם תשובות לפלפולא</span>
        </label>

        <p className="hint">
          גליון {exam?.issueNumber ?? ''} ({gematria}) · {parshiotCount} פרשיות · פרשת {week.parasha}
        </p>

        <div className="row">
          <button className="btn-primary" onClick={() => void handleSend()} disabled={sending}>
            <Icon name="mail" size="1em" /> {sending ? 'שולח…' : 'שלח'}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={sending}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
