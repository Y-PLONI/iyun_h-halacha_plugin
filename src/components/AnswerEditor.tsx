import { useEffect, useRef } from 'react';
import type { Question, ScheduleWeek } from '../data/types';
import {
  getAnswer,
  setAnswerStatus,
  updateAnswerContent,
  useAnswersState,
  useSaveStatus,
} from '../state/answersStore';
import { sanitizeAnswerHtml, htmlToPlainText } from '../utils/html';

const SAVE_LABELS: Record<string, string> = {
  saved: '✓ נשמר',
  saving: '… שומר',
  unsaved: '● לא נשמר',
  error: '⚠ שגיאת שמירה',
};

export function AnswerEditor({ week, question }: { week: ScheduleWeek; question: Question }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const saveStatus = useSaveStatus();
  // נרשמים לשינויים כדי לעדכן ספירת מילים/סטטוס בכותרת
  const answersState = useAnswersState();
  const record = answersState.answers.answersByQuestion[`${week.issueId}:${question.questionId}`];

  // טעינת תוכן בעת החלפת שאלה (ללא איפוס סמן בהקלדה רגילה)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const rec = getAnswer(week.issueId, question.questionId);
    el.innerHTML = rec?.answerHtml ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.issueId, question.questionId]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const clean = sanitizeAnswerHtml(el.innerHTML);
    const text = htmlToPlainText(clean);
    updateAnswerContent(week, question, clean, text);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // הדבקה כטקסט נקי בלבד
    document.execCommand('insertText', false, text);
  };

  const cmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const clearFormat = () => {
    editorRef.current?.focus();
    document.execCommand('removeFormat');
    handleInput();
  };

  const status = record?.status ?? 'empty';
  const wordCount = record?.wordCount ?? 0;
  const isCompleted = status === 'completed';

  const toggleCompleted = () => {
    setAnswerStatus(week, question, isCompleted ? 'draft' : 'completed');
  };

  return (
    <div className="pane" style={{ height: '100%' }}>
      <div className="question-prompt">
        <div className="qp-title">
          <span style={{ color: 'var(--color-primary)' }}>{question.letter}.</span> {question.title}
        </div>
        <div className="qp-body">{question.body}</div>
      </div>

      <div className="answer-toolbar">
        <button className="fmt-btn" title="מודגש" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')}>
          <b>B</b>
        </button>
        <button className="fmt-btn" title="נטוי" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')}>
          <i>I</i>
        </button>
        <button className="fmt-btn" title="קו תחתון" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('underline')}>
          <u>U</u>
        </button>
        <span className="fmt-sep" />
        <button
          className="fmt-btn"
          title="רשימה ממוספרת"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cmd('insertOrderedList')}
        >
          1.
        </button>
        <button
          className="fmt-btn"
          title="רשימת תבליטים"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cmd('insertUnorderedList')}
        >
          •
        </button>
        <span className="fmt-sep" />
        <button className="fmt-btn" title="בטל" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('undo')}>
          ↺
        </button>
        <button className="fmt-btn" title="חזור" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('redo')}>
          ↻
        </button>
        <button className="fmt-btn" title="ניקוי עיצוב" onMouseDown={(e) => e.preventDefault()} onClick={clearFormat}>
          ✕
        </button>
      </div>

      <div
        ref={editorRef}
        className="answer-area"
        contentEditable
        dir="rtl"
        data-placeholder="כתוב כאן את תשובתך…"
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />

      <div className="answer-footer">
        <span className={`save-status ${saveStatus}`}>{SAVE_LABELS[saveStatus]}</span>
        <span>{wordCount} מילים</span>
        <span className="spacer" />
        <button className={`icon-btn${isCompleted ? ' primary' : ''}`} onClick={toggleCompleted}>
          {isCompleted ? '✓ הושלם' : 'סמן כהושלם'}
        </button>
      </div>
    </div>
  );
}
