import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'plain' | 'bordered' | 'active' | 'filled' | 'danger';
  size?: 20 | 24 | 28 | 32;
}

export function IconButton({
  label,
  icon,
  variant = 'plain',
  size = 28,
  className,
  style,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('ds-icon-btn', `ds-icon-btn--${variant}`, className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {icon}
    </button>
  );
}
