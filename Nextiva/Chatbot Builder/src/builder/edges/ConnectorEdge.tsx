import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getSmoothStepPath,
  useInternalNode,
  type ConnectionLineComponentProps,
  type EdgeProps,
} from '@xyflow/react';
import lockClosedIcon from '../../assets/connector/lock-closed.svg';
import lockIcon from '../../assets/connector/lock.svg';
import removeIcon from '../../assets/connector/remove.svg';
import { cx } from '../../design-system';
import { useBuilder } from '../store';
import type { ChatFlowNode, ConnectorFlowEdge } from '../types';
import { OUT_RIGHT_HANDLE, buttonHandleId } from '../types';

const CORNER_RADIUS = 20;

export function ArrowMarkers() {
  return (
    <svg className="cb-markers" aria-hidden>
      <defs>
        {[
          ['cb-arrow', 'var(--neutral-transparent-dark)'],
          ['cb-arrow-active', 'var(--surface-action-primary)'],
        ].map(([id, color]) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 6 8"
            refX="5"
            refY="4"
            markerWidth="6"
            markerHeight="8"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0.6 0.9 L5 4 L0.6 7.1 L1.8 4 Z" fill={color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

function ConnectorEdgeImpl({ id, source, target, sourceHandleId, sourceX, sourceY, targetX, targetY, data, selected }: EdgeProps<ConnectorFlowEdge>) {
  const { nodes, deleteEdge, toggleEdgeLock, testActiveNodeId } = useBuilder();
  const sourceNode = useInternalNode<ChatFlowNode>(source);
  const targetNode = useInternalNode<ChatFlowNode>(target);
  const fromRight = sourceHandleId === OUT_RIGHT_HANDLE;

  // Connectors leave from the bottom-centre of their node (the label says which button they belong to),
  // or from the right-middle when drawn from a static node's right handle.
  let sx = sourceX;
  let sy = sourceY;
  if (sourceNode) {
    const { x, y } = sourceNode.internals.positionAbsolute;
    const w = sourceNode.measured.width ?? 0;
    const h = sourceNode.measured.height ?? 0;
    sx = fromRight ? x + w : x + w / 2;
    sy = fromRight ? y + h / 2 : y + h;
  }

  let tx = targetX;
  let ty = targetY;
  let targetPosition = Position.Top;
  if (fromRight && targetNode) {
    const { x, y } = targetNode.internals.positionAbsolute;
    if (x > sx + 24) {
      tx = x;
      ty = y + (targetNode.measured.height ?? 0) / 2;
      targetPosition = Position.Left;
    }
  }

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: fromRight ? Position.Right : Position.Bottom,
    targetX: tx,
    targetY: ty,
    targetPosition,
    borderRadius: CORNER_RADIUS,
    offset: 20,
  });

  const src = nodes.find((n) => n.id === source);
  const button = src?.data.elements
    .flatMap((el) => el.buttons ?? [])
    .find((b) => buttonHandleId(b.id) === sourceHandleId);
  const branchLabel = sourceHandleId?.startsWith('in-true-') ? 'True' : sourceHandleId?.startsWith('in-false-') ? 'False' : undefined;
  const label = button?.label ?? branchLabel;
  const locked = Boolean(data?.locked);
  const active = selected || (testActiveNodeId !== null && testActiveNodeId === source);
  const showPill = Boolean(label) || selected || locked;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={active ? 'url(#cb-arrow-active)' : 'url(#cb-arrow)'}
        className={cx('cb-edge', active && 'is-active')}
        interactionWidth={16}
      />
      {showPill && (
        <EdgeLabelRenderer>
          <div
            className={cx('cb-edge-pill nodrag nopan', active && 'is-active', locked && 'is-locked')}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <span className="cb-edge-pill__lead">
              <button
                type="button"
                className="cb-edge-pill__icon"
                aria-label={locked ? 'Unlock connector' : 'Lock connector'}
                title={locked ? 'Unlock connector' : 'Lock connector'}
                onClick={() => toggleEdgeLock(id)}
              >
                <img src={locked ? lockClosedIcon : lockIcon} alt="" />
              </button>
              {label && <span className="cb-edge-pill__label">{label}</span>}
            </span>
            {!locked && (
              <button
                type="button"
                className="cb-edge-pill__icon"
                aria-label="Delete connector"
                title="Delete connector"
                onClick={() => deleteEdge(id)}
              >
                <img src={removeIcon} alt="" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ConnectorEdge = memo(ConnectorEdgeImpl);

export function ConnectionLine({ fromX, fromY, toX, toY, fromPosition }: ConnectionLineComponentProps) {
  const fromRight = fromPosition === Position.Right;
  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromRight ? Position.Right : Position.Bottom,
    targetX: toX,
    targetY: toY,
    targetPosition: fromRight && toX > fromX + 24 ? Position.Left : Position.Top,
    borderRadius: CORNER_RADIUS,
  });
  return <path d={path} className="cb-edge cb-edge--drawing" fill="none" markerEnd="url(#cb-arrow)" />;
}
