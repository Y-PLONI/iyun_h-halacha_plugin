import { useMemo, useState } from 'react';
import type { Question, ScheduleWeek } from '../data/types';
import { answerKey } from '../data/types';
import { useAnswersState } from '../state/answersStore';

interface QuestionListProps {
  week: ScheduleWeek;
  questions: Question[];
  selectedId: string | null;
  onSelect: (questionId: string) => void;
  showBody?: boolean;
  search?: boolean;
}

export function QuestionList({
  week,
  questions,
  selectedId,
  onSelect,
  showBody = false,
  search = true,
}: QuestionListProps) {
  const [query, setQuery] = useState('');
  const answers = useAnswersState().answers.answersByQuestion;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return questions;
    return questions.filter(
      (item) => item.title.includes(q) || item.body.includes(q) || item.letter === q,
    );
  }, [query, questions]);

  return (
    <div>
      {search && (
        <input
          className="issue-select"
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="חיפוש בשאלות…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="q-list">
        {filtered.map((q) => {
          const rec = answers[answerKey(week.issueId, q.questionId)];
          const dotClass = rec?.status === 'completed' ? 'completed' : rec?.status === 'draft' ? 'draft' : '';
          return (
            <div
              key={q.questionId}
              className={`q-item${selectedId === q.questionId ? ' selected' : ''}`}
              onClick={() => onSelect(q.questionId)}
            >
              <span className={`q-dot ${dotClass}`} title={rec?.status ?? 'ריק'} />
              <span className="q-letter">{q.letter}.</span>
              <span className="q-title">{q.title}</span>
              {showBody && <div className="q-body">{q.body}</div>}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--color-outline)', fontSize: '0.85rem' }}>אין שאלות תואמות.</p>
        )}
      </div>
    </div>
  );
}
