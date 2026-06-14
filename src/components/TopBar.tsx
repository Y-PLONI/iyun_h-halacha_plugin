import { schedule, getWeek, examsManifest } from '../data/localData';
import { useApp, setSettingsOpen } from '../state/appStore';
import { useSettings } from '../state/settingsStore';
import { saveAnswersNow, getAnswer } from '../state/answersStore';
import { exportWeekDocx } from '../export/docx';
import { sendMail } from '../otzaria/mail';
import { toast } from './Toast';

export function TopBar() {
  const app = useApp();
  const settings = useSettings();
  const period = schedule.periods[0];
  const exam = examsManifest.exams[0];
  const activeWeek = app.activeWeekId ? getWeek(app.activeWeekId) : null;

  const todayLabel = new Date().toLocaleDateString('he-IL');

  const handleExport = async () => {
    if (!activeWeek) {
      toast('בחר שבוע לפני ייצוא');
      return;
    }
    await saveAnswersNow();
    try {
      const filename = exportWeekDocx(
        {
          week: activeWeek,
          settings,
          issueTitle: exam?.title ?? 'עיון ההלכה',
          hebrewMonth: exam?.hebrewMonth ?? period?.title ?? '',
          dateLabel: todayLabel,
        },
        exam?.issueNumber ?? 0,
      );
      toast(`${filename} ירד למחשב`);
    } catch (e) {
      toast('שגיאה בייצוא: ' + (e instanceof Error ? e.message : ''));
    }
  };

  const handleMail = async () => {
    if (!activeWeek) {
      toast('בחר שבוע לפני שליחה');
      return;
    }
    await saveAnswersNow();
    const lines: string[] = [];
    if (settings.name) lines.push(`שם: ${settings.name}`);
    if (settings.personalCode) lines.push(`קוד אישי: ${settings.personalCode}`);
    lines.push(`גליון ${exam?.issueNumber ?? ''} · ${exam?.hebrewMonth ?? ''}`);
    lines.push(`שבוע ${activeWeek.weekNumber} - פרשת ${activeWeek.parasha}`);
    lines.push(activeWeek.sourceRangeTitle);
    lines.push('');
    const rec = getAnswer(activeWeek.weekId);
    lines.push('תשובות:');
    lines.push(rec?.answerText?.trim() || '—');
    const subject = `תשובות לעיון ההלכה - גליון ${exam?.issueNumber ?? ''} - שבוע ${activeWeek.weekNumber}`;
    await sendMail({ to: settings.recipientEmail, subject, body: lines.join('\n') });
    toast('נפתח חלון מייל. אם ייצאת קובץ DOCX, צרף אותו ידנית.');
  };

  return (
    <header className="topbar">
      <h1>עיון ההלכה</h1>
      <span className="issue-chip">גליון {exam?.issueNumber ?? ''} · {exam?.hebrewMonth ?? ''}</span>
      <span className="spacer" />
      <button className="icon-btn" title="ייצוא ל-Word" onClick={() => void handleExport()}>
        <span className="ico">⬇</span> ייצוא
      </button>
      <button className="icon-btn" title="שליחה במייל" onClick={() => void handleMail()}>
        <span className="ico">✉</span> מייל
      </button>
      <button className="icon-btn square" title="הגדרות" aria-label="הגדרות" onClick={() => setSettingsOpen(true)}>
        ⚙
      </button>
    </header>
  );
}
