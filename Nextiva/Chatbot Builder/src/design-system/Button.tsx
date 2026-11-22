import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from './cx';

export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'ghost-secondary'
  | 'muted'
  | 'neutral'
  | 'danger'
  | 'link'
  | 'link-danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('ds-btn', `ds-btn--${size}`, `ds-btn--${variant}`, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
