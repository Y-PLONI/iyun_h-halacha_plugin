import { useState } from 'react';
import { getWeek, getExamMeta, getIssues, getWeeksForIssue } from '../data/localData';
import { useApp, setSettingsOpen, setActiveIssue, goToScreen, type ScreenName } from '../state/appStore';
import { useSettings } from '../state/settingsStore';
import { saveAnswersNow } from '../state/answersStore';
import { exportWeekDocx, exportIssueDocx } from '../export/docx';
import { hasWrittenAnswer } from '../export/answerHtml';
import { toast } from './Toast';
import { Icon } from './Icon';
import { SendDialog } from './SendDialog';
import { usePopover } from './usePopover';

export function TopBar() {
  const app = useApp();
  const settings = useSettings();
  const exam = getExamMeta(app.activeIssueId);
  const issues = getIssues();
  const activeWeek = app.activeWeekId ? getWeek(app.activeWeekId) : null;
  const [sendOpen, setSendOpen] = useState(false);

  const todayLabel = new Date().toLocaleDateString('he-IL');

  const handleExportWeek = async () => {
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

  /** ייצוא כל שבועות הגליון לקובץ אחד. */
  const handleExportIssue = async () => {
    if (!exam) {
      toast('בחר גליון לפני ייצוא');
      return;
    }
    const weeks = getWeeksForIssue(exam.issueId);
    if (weeks.length === 0) {
      toast('אין שבועות בגליון זה');
      return;
    }
    if (!weeks.some((w) => hasWrittenAnswer(w.weekId))) {
      toast('אין תשובות כתובות בגליון זה');
      return;
    }
    await saveAnswersNow();
    try {
      const filename = exportIssueDocx(
        {
          weeks,
          settings,
          issueTitle: exam.title ?? 'עיון ההלכה',
          hebrewMonth: exam.hebrewMonth ?? '',
          dateLabel: todayLabel,
        },
        exam.issueNumber ?? 0,
      );
      toast(`${filename} ירד למחשב`);
    } catch (e) {
      toast('שגיאה בייצוא: ' + (e instanceof Error ? e.message : ''));
    }
  };

  const handleMail = () => {
    if (!activeWeek) {
      toast('בחר שבוע לפני שליחה');
      return;
    }
    setSendOpen(true);
  };

  return (
    <header className="topbar">
      <div className="topbar-side topbar-right">
        <h1>עיון ההלכה</h1>
        <IssuePicker
          current={exam ? `גליון ${exam.issueNumber} · ${exam.hebrewMonth}` : 'בחר גליון'}
          issues={issues.map((e) => ({ id: e.issueId, label: `גליון ${e.issueNumber} · ${e.hebrewMonth}`, active: e.issueId === app.activeIssueId }))}
          onSelect={setActiveIssue}
        />
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-btn${app.screen === n.id ? ' active' : ''}`}
            onClick={() => goToScreen(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className="topbar-side topbar-left">
        <ExportMenu onWeek={() => void handleExportWeek()} onIssue={() => void handleExportIssue()} />
        <button className="icon-btn" title="שליחה במייל" onClick={handleMail}>
          <Icon name="mail" /> מייל
        </button>
        <button className="icon-btn square" title="הגדרות" aria-label="הגדרות" onClick={() => setSettingsOpen(true)}>
          <Icon name="settings" />
        </button>
      </div>
      {sendOpen && activeWeek && (
        <SendDialog week={activeWeek} exam={exam} onClose={() => setSendOpen(false)} />
      )}
    </header>
  );
}

const NAV: { id: ScreenName; label: string }[] = [
  { id: 'schedule', label: 'הספקים' },
  { id: 'questions', label: 'שאלות' },
  { id: 'workspace', label: 'כתיבת תשובות' },
];

/** תפריט הייצוא: שבוע נוכחי או כל שבועות הגליון. */
function ExportMenu({ onWeek, onIssue }: { onWeek: () => void; onIssue: () => void }) {
  const { open, ref, toggle, close } = usePopover();

  const pick = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        className="icon-btn"
        title="ייצוא ל-Word"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name="download" /> ייצוא
        <Icon name="chevron-down" size="0.9em" />
      </button>
      {open && (
        <div className="popover align-start" role="menu">
          <button className="popover-item" role="menuitem" onClick={() => pick(onWeek)}>
            השבוע הנוכחי
          </button>
          <button className="popover-item" role="menuitem" onClick={() => pick(onIssue)}>
            כל השבועות בגליון
          </button>
        </div>
      )}
    </div>
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
  const { open, ref, toggle, close } = usePopover();

  return (
    <div className="popover-anchor" ref={ref}>
      <button className="issue-picker" onClick={toggle} aria-haspopup="listbox" aria-expanded={open}>
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
                close();
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
