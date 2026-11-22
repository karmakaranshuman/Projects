import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { CircleHelp, CircleX, Search } from 'lucide-react';
import { cx } from './cx';

interface FieldShellProps {
  label?: ReactNode;
  required?: boolean;
  help?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, required, help, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cx('ds-field', className)}>
      {label && (
        <label htmlFor={htmlFor} className="ds-field__label t-overline t-overline--heavy">
          {label}
          {required && <span className="ds-field__required">*</span>}
          {help && (
            <span className="ds-field__help" title={help}>
              <CircleHelp size={12} />
            </span>
          )}
        </label>
      )}
      {children}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  required?: boolean;
  help?: string;
  size?: 'sm' | 'md';
  leading?: ReactNode;
  trailing?: ReactNode;
  fieldClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, required, help, size = 'md', leading, trailing, className, fieldClassName, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} help={help} htmlFor={inputId} className={fieldClassName}>
      <div className={cx('ds-input', size === 'sm' && 'ds-input--sm', className)}>
        {leading && <span className="ds-input__icon">{leading}</span>}
        <input ref={ref} id={inputId} className="ds-input__control" {...rest} />
        {trailing}
      </div>
    </FieldShell>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  required?: boolean;
  help?: string;
  toolbar?: ReactNode;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, required, help, toolbar, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} help={help} htmlFor={inputId}>
      {toolbar}
      <div className={cx('ds-input ds-textarea', className)}>
        <textarea ref={ref} id={inputId} className="ds-input__control" {...rest} />
      </div>
    </FieldShell>
  );
});

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
}

export function SearchField({ value, onChange, size = 'md', placeholder = 'Search', ...rest }: SearchFieldProps) {
  return (
    <div className={cx('ds-input', size === 'sm' && 'ds-input--sm')}>
      <span className="ds-input__icon">
        <Search size={size === 'sm' ? 14 : 16} />
      </span>
      <input
        className="ds-input__control"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {value && (
        <button type="button" className="ds-input__clear" aria-label="Clear search" onClick={() => onChange('')}>
          <CircleX size={16} fill="currentColor" stroke="white" />
        </button>
      )}
    </div>
  );
}
