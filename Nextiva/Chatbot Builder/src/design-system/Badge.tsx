import type { ReactNode } from 'react';
import { cx } from './cx';

export interface BadgeProps {
  tone?: 'default' | 'light-blue' | 'purple' | 'green' | 'grey';
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'default', children, className }: BadgeProps) {
  return <span className={cx('ds-badge', `ds-badge--${tone}`, className)}>{children}</span>;
}
