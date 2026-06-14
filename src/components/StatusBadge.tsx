import type { WeekProgress } from '../state/answersStore';

const LABELS: Record<WeekProgress['status'], string> = {
  'not-started': 'טרם התחיל',
  draft: 'טיוטה',
  completed: 'הושלם',
  'missing-data': 'אין מבחן',
};

export function StatusBadge({ progress }: { progress: WeekProgress }) {
  return <span className={`status-badge ${progress.status}`}>{LABELS[progress.status]}</span>;
}
