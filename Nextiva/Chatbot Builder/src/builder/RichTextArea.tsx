import { useImperativeHandle, useLayoutEffect, useRef, type HTMLAttributes, type Ref } from 'react';
import { cx } from '../design-system';
import { sanitizeHtml } from './richText';

export interface RichTextAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'children' | 'dangerouslySetInnerHTML'> {
  html: string;
  onChange: (html: string) => void;
  label: string;
  placeholder?: string;
  editable?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Formatted message text. The DOM owns the content while it has focus, so the caret never jumps;
 * outside focus it follows `html`, which keeps the node and the right panel in sync.
 */
const SHORTCUTS: Record<string, string> = { b: 'bold', i: 'italic', u: 'underline' };

export function RichTextArea({ html, onChange, label, placeholder, editable = true, className, ref, onBlur, onKeyDown, ...rest }: RichTextAreaProps) {
  const inner = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLDivElement, []);

  useLayoutEffect(() => {
    const el = inner.current;
    if (el && el.innerHTML !== html && document.activeElement !== el) el.innerHTML = html;
  }, [html]);

  return (
    <div
      {...rest}
      ref={inner}
      role="textbox"
      aria-multiline
      aria-label={label}
      aria-placeholder={placeholder}
      data-placeholder={placeholder}
      contentEditable={editable}
      suppressContentEditableWarning
      className={cx('cb-rich', !html && 'is-empty', className)}
      onInput={() => {
        const next = sanitizeHtml(inner.current?.innerHTML ?? '');
        if (next !== html) onChange(next);
      }}
      onKeyDown={(e) => {
        const command = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey ? SHORTCUTS[e.key.toLowerCase()] : undefined;
        if (command) {
          e.preventDefault();
          document.execCommand('styleWithCSS', false, 'false');
          document.execCommand(command);
        }
        onKeyDown?.(e);
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
      onBlur={(e) => {
        if (inner.current && inner.current.innerHTML !== html) inner.current.innerHTML = html;
        onBlur?.(e);
      }}
    />
  );
}
