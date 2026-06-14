import { useState } from 'react';
import { getWeek } from '../data/localData';
import { useApp } from '../state/appStore';
import { AnswerEditor } from '../components/AnswerEditor';
import { SourcePane } from '../components/SourcePane';
import { ExamView } from '../components/ExamView';
import { SplitPane, type PaneDef } from '../components/SplitPane';
import { EmptyState } from '../components/EmptyState';

type NarrowTab = 'exam' | 'answer' | 'sources';

export function WorkspaceScreen() {
  const app = useApp();
  const week = app.activeWeekId ? getWeek(app.activeWeekId) : null;
  const [narrowTab, setNarrowTab] = useState<NarrowTab>('answer');

  if (!week) {
    return (
      <div className="screen-pad">
        <EmptyState icon="edit" title="בחר שבוע מהמסך 'הספקים' כדי להתחיל לכתוב" />
      </div>
    );
  }

  const examContent = <ExamView week={week} />;
  const answerContent = <AnswerEditor key={week.weekId} week={week} />;
  const sourcesContent = <SourcePane week={week} />;

  // ── מסך צר: טאבים ──
  if (app.isNarrow) {
    return (
      <div className="workspace">
        <div className="ws-tabs">
          <button className={`nav-btn${narrowTab === 'exam' ? ' active' : ''}`} onClick={() => setNarrowTab('exam')}>
            מבחן
          </button>
          <button className={`nav-btn${narrowTab === 'answer' ? ' active' : ''}`} onClick={() => setNarrowTab('answer')}>
            תשובה
          </button>
          <button className={`nav-btn${narrowTab === 'sources' ? ' active' : ''}`} onClick={() => setNarrowTab('sources')}>
            מקורות
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {narrowTab === 'exam' && <div className="pane-body">{examContent}</div>}
          {narrowTab === 'answer' && answerContent}
          {narrowTab === 'sources' && sourcesContent}
        </div>
      </div>
    );
  }

  // ── מסך רחב: שלוש חלוניות ──
  // סדר RTL: מבחן (ימין) | תשובה (מרכז) | מקורות (שמאל)
  const panes: PaneDef[] = [
    { id: 'exam', title: 'מבחן', minSize: 14, defaultSize: 22, collapsible: true, content: examContent },
    { id: 'answer', title: 'תשובה', minSize: 22, defaultSize: 28, content: answerContent },
    { id: 'sources', title: 'מקורות', minSize: 20, defaultSize: 50, collapsible: true, content: sourcesContent },
  ];

  return (
    <div className="workspace">
      <SplitPane direction="horizontal" panes={panes} storageKey="workspace-v4" />
    </div>
  );
}
