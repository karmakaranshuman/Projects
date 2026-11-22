import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  /** `start` lines the bubble up with the anchor's left edge, as on the element chips. */
  align?: 'start' | 'center';
  suppressed?: boolean;
  delay?: number;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

/**
 * Hover/focus tooltip rendered into a portal so scrolling panels with overflow clipping
 * (like the elements panel) can't crop it.
 */
export function Tooltip({ content, children, placement = 'top', align = 'center', suppressed, delay = 350 }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setPos(null);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    if (!open || suppressed || !anchorRef.current || !bubbleRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();
    let left = align === 'start' ? a.left : a.left + a.width / 2 - b.width / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - b.width - VIEWPORT_MARGIN);
    const above = a.top - GAP - b.height;
    const below = a.bottom + GAP;
    const top =
      placement === 'top'
        ? above < VIEWPORT_MARGIN
          ? below
          : above
        : below + b.height > window.innerHeight - VIEWPORT_MARGIN
          ? above
          : below;
    setPos({ left, top });
  }, [open, suppressed, align, placement, content]);

  return (
    <span
      ref={anchorRef}
      className="ds-tooltip"
      aria-describedby={open && !suppressed ? id : undefined}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        !suppressed &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            className="ds-tooltip__bubble"
            data-ready={pos ? 'true' : undefined}
            style={pos ? { left: pos.left, top: pos.top } : undefined}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
