import type { ReactNode } from 'react';

export function EmptyState({
  icon = '📭',
  title,
  children,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="big">{icon}</div>
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      {children}
    </div>
  );
}
