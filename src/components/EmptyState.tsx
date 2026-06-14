import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '../icons/fluent';

export function EmptyState({
  icon = 'document',
  title,
  children,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="big">
        <Icon name={icon} />
      </span>
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      {children}
    </div>
  );
}
