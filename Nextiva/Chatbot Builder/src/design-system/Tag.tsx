import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** Trailing 16px badge, e.g. the AI sparkle on nodes and prompts that are live. */
  badge?: ReactNode;
  badgeLabel?: string;
  selected?: boolean;
  /** Render as a static chip instead of a button. */
  static?: boolean;
}

export function Tag({ icon, badge, badgeLabel, selected, static: isStatic, className, children, type = 'button', ...rest }: TagProps) {
  const classes = cx('ds-tag', Boolean(icon) && 'has-icon', selected && 'ds-tag--selected', className);
  const content = (
    <>
      <span className="ds-tag__lead">
        {icon && <span className="ds-tag__icon">{icon}</span>}
        <span className="ds-tag__label">{children}</span>
      </span>
      {badge && (
        <span className="ds-tag__badge" title={badgeLabel} aria-label={badgeLabel} role={badgeLabel ? 'img' : undefined}>
          {badge}
        </span>
      )}
    </>
  );
  if (isStatic) return <span className={classes}>{content}</span>;
  return (
    <button type={type} className={classes} aria-pressed={selected} {...rest}>
      {content}
    </button>
  );
}
