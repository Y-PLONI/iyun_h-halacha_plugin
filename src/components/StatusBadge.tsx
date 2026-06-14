import type { WeekProgress } from '../state/answersStore';

const LABELS: Record<WeekProgress['status'], string> = {
  'not-started': 'טרם התחיל',
  draft: 'טיוטה',
  completed: 'הושלם',
  'missing-data': 'חסר קובץ שאלות',
};

export function StatusBadge({ progress }: { progress: WeekProgress }) {
  const label =
    progress.status === 'draft' || progress.status === 'completed'
      ? `${LABELS[progress.status]} · ${progress.completed}/${progress.total}`
      : LABELS[progress.status];
  return <span className={`status-badge ${progress.status}`}>{label}</span>;
}
