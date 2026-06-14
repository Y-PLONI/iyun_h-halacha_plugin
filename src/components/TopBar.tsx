import { useEffect, useRef, useState } from 'react';
import { getWeek, getExamMeta, getIssues } from '../data/localData';
import { useApp, setSettingsOpen, setActiveIssue } from '../state/appStore';
import { useSettings } from '../state/settingsStore';
import { saveAnswersNow, getAnswer } from '../state/answersStore';
import { exportWeekDocx } from '../export/docx';
import { sendMail } from '../otzaria/mail';
import { toast } from './Toast';
import { Icon } from './Icon';

export function TopBar() {
  const app = useApp();
  const settings = useSettings();
  const exam = getExamMeta(app.activeIssueId);
  const issues = getIssues();
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
          hebrewMonth: exam?.hebrewMonth ?? '',
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
      <IssuePicker
        current={exam ? `גליון ${exam.issueNumber} · ${exam.hebrewMonth}` : 'בחר גליון'}
        issues={issues.map((e) => ({ id: e.issueId, label: `גליון ${e.issueNumber} · ${e.hebrewMonth}`, active: e.issueId === app.activeIssueId }))}
        onSelect={setActiveIssue}
      />
      <span className="spacer" />
      <button className="icon-btn" title="ייצוא ל-Word" onClick={() => void handleExport()}>
        <Icon name="download" /> ייצוא
      </button>
      <button className="icon-btn" title="שליחה במייל" onClick={() => void handleMail()}>
        <Icon name="mail" /> מייל
      </button>
      <button className="icon-btn square" title="הגדרות" aria-label="הגדרות" onClick={() => setSettingsOpen(true)}>
        <Icon name="settings" />
      </button>
    </header>
  );
}

interface IssueOption {
  id: string;
  label: string;
  active: boolean;
}

function IssuePicker({
  current,
  issues,
  onSelect,
}: {
  current: string;
  issues: IssueOption[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="popover-anchor" ref={ref}>
      <button className="issue-picker" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{current}</span>
        <Icon name="chevron-down" size="0.9em" />
      </button>
      {open && (
        <div className="popover" role="listbox">
          {issues.map((iss) => (
            <button
              key={iss.id}
              className={`popover-item${iss.active ? ' active' : ''}`}
              role="option"
              aria-selected={iss.active}
              onClick={() => {
                onSelect(iss.id);
                setOpen(false);
              }}
            >
              {iss.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
