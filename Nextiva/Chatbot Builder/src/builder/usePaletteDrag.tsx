import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import { ElementChip } from '../design-system';
import { canAddElement, elementSpec } from './elements';
import { useBuilder } from './store';
import type { ElementType } from './types';

const DRAG_THRESHOLD = 4;
const NODE_HALF_WIDTH = 130;
const GHOST_OFFSET = { x: 20, y: 18 };

type DropSpot = { kind: 'node'; nodeId: string } | { kind: 'canvas' } | { kind: 'none' };

/** Panels float above the canvas, so only drops that land on the canvas itself (or a node) count. */
function dropSpotAt(x: number, y: number): DropSpot {
  const stack = document.elementsFromPoint(x, y);
  const top = stack[0];
  if (!top || top.closest('.cb-left, .cb-right, .cb-header, .cb-presenter')) return { kind: 'none' };
  const nodeEl = stack.find((el) => el.classList.contains('react-flow__node'));
  const nodeId = nodeEl?.getAttribute('data-id');
  if (nodeId) return { kind: 'node', nodeId };
  return top.closest('.cb-canvas') ? { kind: 'canvas' } : { kind: 'none' };
}

/**
 * Pointer-driven drag from the element palette onto the canvas. Native HTML5 DnD can't render the
 * design's drag chip and is unreliable on touch, so the ghost is a portal positioned by hand.
 */
export function usePaletteDrag() {
  const {
    nodes,
    dragElement,
    dropTarget,
    setDragElement,
    setDropTarget,
    addElementToNode,
    addNodeWithElement,
  } = useBuilder();
  const { screenToFlowPosition } = useReactFlow();
  const ghostRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const placeGhost = () => {
    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate(${pos.current.x - GHOST_OFFSET.x}px, ${pos.current.y - GHOST_OFFSET.y}px)`;
    }
  };

  const drop = useCallback(
    (type: ElementType, spot: DropSpot, x: number, y: number) => {
      if (spot.kind === 'node') {
        addElementToNode(spot.nodeId, type);
      } else if (spot.kind === 'canvas') {
        const p = screenToFlowPosition({ x, y });
        addNodeWithElement(type, { x: p.x - NODE_HALF_WIDTH, y: p.y - 20 });
      }
    },
    [addElementToNode, addNodeWithElement, screenToFlowPosition],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>, type: ElementType) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let dragging = false;
      let lastKey = '';

      const updateTarget = (spot: DropSpot) => {
        const node = spot.kind === 'node' ? nodesRef.current.find((n) => n.id === spot.nodeId) : undefined;
        const allowed = node ? canAddElement(node.data.elements, type) : false;
        const key = node ? `${node.id}:${allowed}` : '';
        if (key === lastKey) return;
        lastKey = key;
        setDropTarget(node ? { nodeId: node.id, allowed } : null);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('keydown', onKey);
        document.body.classList.remove('cb-dragging');
        setDragElement(null);
        setDropTarget(null);
        cancelRef.current = null;
      };
      const onMove = (ev: PointerEvent) => {
        pos.current = { x: ev.clientX, y: ev.clientY };
        if (!dragging) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD) return;
          dragging = true;
          document.body.classList.add('cb-dragging');
          setDragElement(type);
        }
        placeGhost();
        updateTarget(dropSpotAt(ev.clientX, ev.clientY));
      };
      const onUp = (ev: PointerEvent) => {
        if (dragging) drop(type, dropSpotAt(ev.clientX, ev.clientY), ev.clientX, ev.clientY);
        cleanup();
      };
      const onKey = (ev: globalThis.KeyboardEvent) => {
        if (ev.key === 'Escape') cleanup();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('keydown', onKey);
      cancelRef.current = cleanup;
    },
    [drop, setDragElement, setDropTarget],
  );

  /** Keyboard alternative: Enter adds to the selected node, otherwise creates a node in the middle of the view. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, type: ElementType) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const selected = nodesRef.current.find((n) => n.selected);
      if (selected) {
        drop(type, { kind: 'node', nodeId: selected.id }, 0, 0);
        return;
      }
      const rect = document.querySelector('.cb-canvas')?.getBoundingClientRect();
      if (!rect) return;
      drop(type, { kind: 'canvas' }, rect.left + rect.width / 2, rect.top + rect.height / 3);
    },
    [drop],
  );

  const ghost = dragElement
    ? createPortal(
        <div
          ref={ghostRef}
          className="cb-drag-ghost"
          style={{ transform: `translate(${pos.current.x - GHOST_OFFSET.x}px, ${pos.current.y - GHOST_OFFSET.y}px)` }}
          aria-hidden
        >
          <ElementChip
            icon={elementSpec(dragElement).icon}
            family={elementSpec(dragElement).family}
            label={elementSpec(dragElement).label}
            state={dropTarget && !dropTarget.allowed ? 'warning' : 'selected'}
          />
        </div>,
        document.body,
      )
    : null;

  return { onPointerDown, onKeyDown, ghost };
}
