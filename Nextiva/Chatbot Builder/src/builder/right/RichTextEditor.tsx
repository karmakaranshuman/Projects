import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Bold, Italic, Link, Smile, Underline, Unlink } from 'lucide-react';
import { Button, cx, IconButton, TextField } from '../../design-system';
import { RichTextArea } from '../RichTextArea';
import { normalizeUrl, TEXT_COLORS } from '../richText';
import { useDismiss } from '../useDismiss';

const EMOJIS = ['😀', '😊', '🙂', '😉', '😍', '🤔', '😢', '🙏', '👍', '👋', '👏', '🎉', '✅', '❌', '⭐', '❤️', '📞', '✉️', '🔗', '📅'];

type Style = 'bold' | 'italic' | 'underline';
type Menu = 'color' | 'link' | 'emoji' | null;

interface Selection {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: boolean;
  color: string;
}

const NONE: Selection = { bold: false, italic: false, underline: false, link: false, color: '' };

/** Toolbar buttons must not take focus, or the text selection they act on is lost. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function RichTextEditor({ html, onChange, onFocus }: { html: string; onChange: (html: string) => void; onFocus: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const [state, setState] = useState<Selection>(NONE);
  const [menu, setMenu] = useState<Menu>(null);
  const [url, setUrl] = useState('');
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(toolbar, menu !== null, closeMenu);

  /** Remembers the selection inside the text and reflects its formatting in the toolbar. */
  const track = useCallback(() => {
    const el = area.current;
    const sel = document.getSelection();
    if (!el || !sel?.rangeCount || !el.contains(sel.anchorNode)) return;
    range.current = sel.getRangeAt(0).cloneRange();
    const anchor = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
    const link = anchor?.closest('a');
    const inLink = Boolean(link && el.contains(link));
    setState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      // Links are drawn underlined, which the browser reports as underline formatting.
      underline: !inLink && document.queryCommandState('underline'),
      link: inLink,
      color: document.queryCommandValue('foreColor'),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', track);
    return () => document.removeEventListener('selectionchange', track);
  }, [track]);

  /** Puts focus and the last selection back into the text so a command applies to it. */
  const restore = () => {
    const el = area.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    const sel = document.getSelection();
    if (!sel) return;
    const saved = range.current && el.contains(range.current.startContainer) ? range.current : null;
    if (saved) {
      sel.removeAllRanges();
      sel.addRange(saved);
    } else if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      const end = document.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      sel.removeAllRanges();
      sel.addRange(end);
    }
  };

  const exec = (command: string, value?: string) => {
    restore();
    document.execCommand('styleWithCSS', false, command === 'foreColor' ? 'true' : 'false');
    document.execCommand(command, false, value);
    track();
  };

  const applyLink = () => {
    const target = url.trim();
    setMenu(null);
    setUrl('');
    if (!target) return;
    const href = normalizeUrl(target);
    restore();
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed) exec('createLink', href);
    else exec('insertHTML', `<a href="${escapeHtml(href)}">${escapeHtml(target)}</a>&nbsp;`);
  };

  const style = (key: Style, label: string, icon: ReactNode) => (
    <IconButton
      label={label}
      size={24}
      variant={state[key] ? 'active' : 'bordered'}
      aria-pressed={state[key]}
      icon={icon}
      onMouseDown={keepFocus}
      onClick={() => exec(key)}
    />
  );

  return (
    <div className="cb-rte">
      <div className="cb-rte__toolbar" role="toolbar" aria-label="Text formatting" ref={toolbar}>
        <div className="cb-rte__group">
          {style('bold', 'Bold', <Bold size={14} />)}
          {style('italic', 'Italic', <Italic size={14} />)}
          {style('underline', 'Underline', <Underline size={14} />)}
          <button
            type="button"
            className={cx('cb-rte__color', menu === 'color' && 'is-open')}
            style={state.color ? { background: state.color } : undefined}
            aria-label="Text colour"
            title="Text colour"
            aria-haspopup="menu"
            aria-expanded={menu === 'color'}
            onMouseDown={keepFocus}
            onClick={() => setMenu(menu === 'color' ? null : 'color')}
          />
        </div>
        <span className="cb-rte__divider" aria-hidden />
        <div className="cb-rte__group">
          {state.link ? (
            <IconButton label="Remove link" size={24} variant="active" icon={<Unlink size={14} />} onMouseDown={keepFocus} onClick={() => exec('unlink')} />
          ) : (
            <IconButton
              label="Insert link"
              size={24}
              variant={menu === 'link' ? 'active' : 'bordered'}
              aria-expanded={menu === 'link'}
              icon={<Link size={14} />}
              onMouseDown={keepFocus}
              onClick={() => setMenu(menu === 'link' ? null : 'link')}
            />
          )}
          <IconButton
            label="Insert emoji"
            size={24}
            variant={menu === 'emoji' ? 'active' : 'bordered'}
            aria-expanded={menu === 'emoji'}
            icon={<Smile size={14} />}
            onMouseDown={keepFocus}
            onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')}
          />
        </div>

        {menu === 'color' && (
          <div className="cb-rte__pop cb-rte__swatches" role="menu" aria-label="Text colour">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="menuitem"
                className="cb-rte__swatch"
                style={{ background: c.value }}
                aria-label={c.label}
                title={c.label}
                onMouseDown={keepFocus}
                onClick={() => {
                  exec('foreColor', c.value);
                  setMenu(null);
                }}
              />
            ))}
          </div>
        )}
        {menu === 'emoji' && (
          <div className="cb-rte__pop cb-rte__emojis" role="menu" aria-label="Emoji">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                role="menuitem"
                className="cb-rte__emoji"
                onMouseDown={keepFocus}
                onClick={() => {
                  exec('insertText', e);
                  setMenu(null);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        {menu === 'link' && (
          <div className="cb-rte__pop cb-rte__link">
            <TextField
              aria-label="Link address"
              leading={<Link size={14} />}
              placeholder="www.company.com"
              value={url}
              autoFocus
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            />
            <Button variant="outline" size="sm" disabled={!url.trim()} onClick={applyLink}>
              Add
            </Button>
          </div>
        )}
      </div>
      <RichTextArea ref={area} label="Message" className="cb-rte__input" html={html} placeholder="Type your message" onChange={onChange} onFocus={onFocus} />
    </div>
  );
}
