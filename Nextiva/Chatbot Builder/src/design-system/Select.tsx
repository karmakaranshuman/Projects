import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { FieldShell } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SelectProps {
  label?: ReactNode;
  help?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  /** Shown on every row, when an option has no icon of its own. */
  icon?: ReactNode;
  id?: string;
  'aria-label'?: string;
  onChange: (value: string) => void;
}

/** Field that opens the standard menu: white, 4px radius, dropdown shadow, 40px rows. */
export function Select({ label, help, options, placeholder, onChange, id, value, disabled, icon, 'aria-label': ariaLabel }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const listId = `${selectId}-list`;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  useLayoutEffect(() => {
    const list = menu.current;
    const field = root.current;
    if (!open || !list || !field) return;
    const place = () => {
      const trigger = field.getBoundingClientRect();
      let top = 0;
      let bottom = window.innerHeight;
      let node = field.parentElement;
      while (node) {
        const style = getComputedStyle(node);
        if (/(auto|hidden|scroll|clip)/.test(style.overflowY)) {
          const box = node.getBoundingClientRect();
          top = Math.max(top, box.top);
          bottom = Math.min(bottom, box.bottom);
        }
        node = node.parentElement;
      }
      const gap = 2;
      list.style.left = `${trigger.left}px`;
      list.style.width = `${trigger.width}px`;
      const height = list.scrollHeight;
      const below = bottom - trigger.bottom;
      const above = trigger.top - top;
      const upward = below < Math.min(height, 240) + gap && above > below;
      const space = Math.max(80, Math.min(240, (upward ? above : below) - gap));
      list.style.maxHeight = `${space}px`;
      if (upward) {
        list.style.top = 'auto';
        list.style.bottom = `${window.innerHeight - trigger.top + gap}px`;
      } else {
        list.style.bottom = 'auto';
        list.style.top = `${trigger.bottom + gap}px`;
      }
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, options]);

  const selected = options.find((o) => o.value === value);

  return (
    <FieldShell label={label} help={help} htmlFor={selectId}>
      <div className="ds-select" ref={root}>
        <button
          type="button"
          id={selectId}
          className="ds-select__trigger"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={selected ? 'ds-select__value' : 'ds-select__value is-placeholder'}>{selected?.label ?? placeholder}</span>
          <ChevronDown className="ds-select__chevron" size={16} />
        </button>
        {open && (
          <div className="ds-menu ds-select__menu" id={listId} role="listbox" ref={menu}>
            {options.length ? (
              options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className="ds-menu__item"
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                >
                  {(o.icon || icon) && <span className="ds-menu__icon">{o.icon ?? icon}</span>}
                  <span className="ds-menu__label">{o.label}</span>
                </button>
              ))
            ) : (
              <span className="ds-menu__item is-empty">No options</span>
            )}
          </div>
        )}
      </div>
    </FieldShell>
  );
}
