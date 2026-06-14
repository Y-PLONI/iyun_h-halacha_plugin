import { schedule, getQuestionsForWeek, getWeek, examsManifest } from '../data/localData';
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
    const questions = getQuestionsForWeek(activeWeek);
    if (questions.length === 0) {
      toast('אין שאלות לשבוע זה');
      return;
    }
    try {
      const filename = exportWeekDocx(
        {
          week: activeWeek,
          questions,
          settings,
          issueTitle: exam?.title ?? 'עיון ההלכה',
          hebrewMonth: exam?.hebrewMonth ?? period?.title ?? '',
          dateLabel: todayLabel,
          includeQuestionText: true,
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
    const questions = getQuestionsForWeek(activeWeek);
    const lines: string[] = [];
    if (settings.name) lines.push(`שם: ${settings.name}`);
    if (settings.personalCode) lines.push(`קוד אישי: ${settings.personalCode}`);
    lines.push(`גליון ${exam?.issueNumber ?? ''} · ${exam?.hebrewMonth ?? ''}`);
    lines.push(`שבוע ${activeWeek.weekNumber} - פרשת ${activeWeek.parasha}`);
    lines.push('');
    let order = 0;
    for (const q of questions) {
      order++;
      const rec = getAnswer(activeWeek.issueId, q.questionId);
      lines.push(`שאלה ${q.letter}: ${q.title}`);
      lines.push('תשובה:');
      lines.push(rec?.answerText?.trim() || '—');
      lines.push('');
    }
    const subject = `תשובות לעיון ההלכה - גליון ${exam?.issueNumber ?? ''} - שבוע ${activeWeek.weekNumber}`;
    await sendMail({ to: settings.recipientEmail, subject, body: lines.join('\n') });
    toast('נפתח חלון מייל. אם ייצאת קובץ DOCX, צרף אותו ידנית.');
  };

  return (
    <div className="topbar">
      <h1>עיון ההלכה</h1>
      <select className="issue-select" value={exam?.issueId ?? ''} disabled>
        <option value={exam?.issueId ?? ''}>
          גליון {exam?.issueNumber ?? ''} · {exam?.hebrewMonth ?? ''}
        </option>
      </select>
      <span className="spacer" />
      <button className="icon-btn" title="רענון נתונים" onClick={() => toast('הנתונים מעודכנים (גרסה מקומית)')}>
        ↻ רענן
      </button>
      <button className="icon-btn" title="ייצוא ל-Word" onClick={() => void handleExport()}>
        ⬇ ייצוא
      </button>
      <button className="icon-btn" title="שליחה במייל" onClick={() => void handleMail()}>
        ✉ מייל
      </button>
      <button className="icon-btn" title="הגדרות" onClick={() => setSettingsOpen(true)}>
        ⚙
      </button>
    </div>
  );
}
