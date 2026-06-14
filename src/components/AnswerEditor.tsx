import { useEffect, useRef } from 'react';
import type { ScheduleWeek } from '../data/types';
import {
  getAnswer,
  setAnswerStatus,
  updateAnswerContent,
  useAnswersState,
  useSaveStatus,
} from '../state/answersStore';
import { sanitizeAnswerHtml, htmlToPlainText } from '../utils/html';
import { Icon } from './Icon';

const SAVE_LABELS: Record<string, string> = {
  saved: '✓ נשמר',
  saving: '… שומר',
  unsaved: '● לא נשמר',
  error: '⚠ שגיאת שמירה',
};

export function AnswerEditor({ week }: { week: ScheduleWeek }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const saveStatus = useSaveStatus();
  // נרשמים לשינויים כדי לעדכן ספירת מילים/סטטוס בכותרת
  const answersState = useAnswersState();
  const record = answersState.answers.answersByWeek[week.weekId];

  // טעינת תוכן בעת החלפת שבוע (ללא איפוס סמן בהקלדה רגילה)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const rec = getAnswer(week.weekId);
    el.innerHTML = rec?.answerHtml ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.weekId]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const clean = sanitizeAnswerHtml(el.innerHTML);
    const text = htmlToPlainText(clean);
    updateAnswerContent(week, clean, text);
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
    setAnswerStatus(week, isCompleted ? 'draft' : 'completed');
  };

  return (
    <div className="pane-stack">
      <div className="answer-toolbar">
        <button className="fmt-btn" title="מודגש" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')}>
          <Icon name="bold" />
        </button>
        <button className="fmt-btn" title="נטוי" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')}>
          <Icon name="italic" />
        </button>
        <button className="fmt-btn" title="קו תחתון" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('underline')}>
          <Icon name="underline" />
        </button>
        <span className="fmt-sep" />
        <button
          className="fmt-btn"
          title="רשימה ממוספרת"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cmd('insertOrderedList')}
        >
          <Icon name="list-ordered" />
        </button>
        <button
          className="fmt-btn"
          title="רשימת תבליטים"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => cmd('insertUnorderedList')}
        >
          <Icon name="list-bullet" />
        </button>
        <span className="fmt-sep" />
        <button className="fmt-btn" title="בטל" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('undo')}>
          <Icon name="undo" />
        </button>
        <button className="fmt-btn" title="חזור" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('redo')}>
          <Icon name="redo" />
        </button>
        <button className="fmt-btn" title="ניקוי עיצוב" onMouseDown={(e) => e.preventDefault()} onClick={clearFormat}>
          <Icon name="clear-format" />
        </button>
      </div>

      <div
        ref={editorRef}
        className="answer-area"
        contentEditable
        dir="rtl"
        data-placeholder="כתוב כאן את תשובותיך לשבוע זה…"
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />

      <div className="answer-footer">
        <span className={`save-status ${saveStatus}`}>{SAVE_LABELS[saveStatus]}</span>
        <span>{wordCount} מילים</span>
        <span className="spacer" />
        <button className={`btn-chip${isCompleted ? ' primary' : ''}`} onClick={toggleCompleted}>
          {isCompleted ? '✓ הושלם' : 'סמן כהושלם'}
        </button>
      </div>
    </div>
  );
}
