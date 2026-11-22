import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { ElementIcon, type IconFamily, type IconSource } from './ElementIcon';
import { Tooltip } from './Tooltip';

export interface ElementChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  icon: IconSource;
  family: IconFamily;
  label: string;
  tooltip?: ReactNode;
  size?: 'full' | 'mini';
  /** `selected` while being dragged; `warning` is the red "this node already has an input" state. */
  state?: 'default' | 'selected' | 'disabled' | 'warning';
  draggable?: boolean;
}

export function ElementChip({
  icon,
  family,
  label,
  tooltip,
  size = 'full',
  state = 'default',
  draggable,
  className,
  ...rest
}: ElementChipProps) {
  const chip = (
    <div
      className={cx(
        'ds-chip',
        size === 'mini' && 'ds-chip--mini',
        state === 'selected' && 'ds-chip--selected',
        state === 'disabled' && 'ds-chip--disabled',
        state === 'warning' && 'ds-chip--warning',
        draggable && 'ds-chip--draggable',
        className,
      )}
      role="button"
      aria-label={draggable ? `${label} element. Drag onto the canvas, or press Enter to add.` : label}
      tabIndex={draggable ? 0 : undefined}
      {...rest}
    >
      <ElementIcon icon={icon} family={family} size={size === 'mini' ? 'mini' : 'full'} />
      {size === 'full' && <span>{label}</span>}
    </div>
  );
  if (!tooltip) return chip;
  return (
    <Tooltip
      content={size === 'mini' ? label : tooltip}
      align={size === 'mini' ? 'center' : 'start'}
      suppressed={state !== 'default'}
    >
      {chip}
    </Tooltip>
  );
}
