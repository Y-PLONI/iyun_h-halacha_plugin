import { useEffect, useState } from 'react';
import { getQuestionsForWeek, getWeek } from '../data/localData';
import { useApp, selectQuestion } from '../state/appStore';
import { saveAnswersNow } from '../state/answersStore';
import { QuestionList } from '../components/QuestionList';
import { AnswerEditor } from '../components/AnswerEditor';
import { SourcePane } from '../components/SourcePane';
import { SplitPane, type PaneDef } from '../components/SplitPane';
import { EmptyState } from '../components/EmptyState';

type NarrowTab = 'questions' | 'answer' | 'sources';

export function WorkspaceScreen() {
  const app = useApp();
  const week = app.activeWeekId ? getWeek(app.activeWeekId) : null;
  const questions = week ? getQuestionsForWeek(week) : [];
  const [narrowTab, setNarrowTab] = useState<NarrowTab>('answer');

  const activeId = app.activeQuestionId ?? questions[0]?.questionId ?? null;
  const activeQuestion = questions.find((q) => q.questionId === activeId) ?? null;

  // אם אין שאלה נבחרת, בוחרים את הראשונה
  useEffect(() => {
    if (!app.activeQuestionId && questions[0]) {
      selectQuestion(questions[0].questionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.activeWeekId]);

  const handleSelect = (qid: string) => {
    void saveAnswersNow(); // שמירה מיידית במעבר שאלה
    selectQuestion(qid);
    setNarrowTab('answer');
  };

  if (!week) {
    return (
      <div className="screen-pad">
        <EmptyState icon="✍️" title="בחר שבוע מהמסך 'הספקים' כדי להתחיל לכתוב" />
      </div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className="screen-pad">
        <EmptyState icon="📭" title="אין שאלות מובנות לשבוע זה" />
      </div>
    );
  }

  const questionsContent = (
    <QuestionList week={week} questions={questions} selectedId={activeId} onSelect={handleSelect} />
  );
  const answerContent = activeQuestion ? (
    <AnswerEditor key={activeQuestion.questionId} week={week} question={activeQuestion} />
  ) : (
    <EmptyState icon="✍️" title="בחר שאלה" />
  );
  const sourcesContent = <SourcePane week={week} selectedQuestion={activeQuestion} />;

  // ── מסך צר: טאבים ──
  if (app.isNarrow) {
    return (
      <div className="workspace">
        <div className="ws-tabs">
          <button className={`nav-btn${narrowTab === 'questions' ? ' active' : ''}`} onClick={() => setNarrowTab('questions')}>
            שאלות
          </button>
          <button className={`nav-btn${narrowTab === 'answer' ? ' active' : ''}`} onClick={() => setNarrowTab('answer')}>
            תשובה
          </button>
          <button className={`nav-btn${narrowTab === 'sources' ? ' active' : ''}`} onClick={() => setNarrowTab('sources')}>
            מקורות
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {narrowTab === 'questions' && <div className="pane-body">{questionsContent}</div>}
          {narrowTab === 'answer' && answerContent}
          {narrowTab === 'sources' && sourcesContent}
        </div>
      </div>
    );
  }

  // ── מסך רחב: שלוש חלוניות ──
  // סדר RTL: שאלות (ימין) | תשובות (מרכז) | מקורות (שמאל)
  const panes: PaneDef[] = [
    { id: 'questions', title: 'שאלות', minSize: 12, defaultSize: 24, collapsible: true, content: questionsContent },
    { id: 'answer', title: 'תשובה', minSize: 25, defaultSize: 42, content: <div style={{ height: '100%' }}>{answerContent}</div> },
    { id: 'sources', title: 'מקורות', minSize: 14, defaultSize: 34, collapsible: true, content: sourcesContent },
  ];

  return (
    <div className="workspace">
      <SplitPane direction="horizontal" panes={panes} storageKey="workspace-3" />
    </div>
  );
}
