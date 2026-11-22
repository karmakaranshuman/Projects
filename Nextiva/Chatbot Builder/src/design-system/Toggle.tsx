import { cx } from './cx';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx('ds-toggle', 'nodrag', className)}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    />
  );
}
