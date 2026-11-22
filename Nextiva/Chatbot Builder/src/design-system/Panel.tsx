import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { cx } from './cx';
import { IconButton } from './IconButton';

export interface PanelProps {
  title: ReactNode;
  /** Small glyph before the title, e.g. the sparkle on an element prompt. */
  icon?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `secondary` is the grey card used for element editors under node details. */
  tone?: 'primary' | 'secondary';
  className?: string;
  'aria-label'?: string;
}

export function Panel({ title, icon, onBack, onClose, actions, children, footer, tone = 'primary', className, ...rest }: PanelProps) {
  return (
    <section className={cx('ds-panel', tone === 'secondary' && 'ds-panel--secondary', onBack && 'has-back', className)} aria-label={rest['aria-label']}>
      <header className="ds-panel__header">
        {onBack && <IconButton label="Back" size={24} icon={<ChevronLeft size={16} />} onClick={onBack} />}
        {icon && <span className="ds-panel__icon">{icon}</span>}
        <h2 className="ds-panel__title t-overline">{title}</h2>
        {actions}
        {onClose && <IconButton label="Close panel" size={24} icon={<X size={16} />} onClick={onClose} />}
      </header>
      {children && <div className="ds-panel__body">{children}</div>}
      {footer && <div className="ds-panel__footer">{footer}</div>}
    </section>
  );
}

export function Inset({ title, dense, children }: { title?: ReactNode; dense?: boolean; children: ReactNode }) {
  return (
    <div className={cx('ds-inset', dense && 'ds-inset--dense')}>
      {title && <div className="t-overline t-overline--heavy">{title}</div>}
      {children}
    </div>
  );
}

export function Divider({ vertical }: { vertical?: boolean }) {
  return <hr className={cx('ds-divider', vertical && 'ds-divider--vertical')} />;
}
