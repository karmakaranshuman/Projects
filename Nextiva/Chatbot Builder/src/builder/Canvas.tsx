import { useCallback, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type FinalConnectionState,
  type IsValidConnection,
} from '@xyflow/react';
import { MousePointerClick } from 'lucide-react';
import { useTheme } from '../theme';
import { ArrowMarkers, ConnectionLine, ConnectorEdge } from './edges/ConnectorEdge';
import { FIT_VIEW } from './fit';
import { ChatNode } from './nodes/ChatNode';
import { useBuilder } from './store';
import type { ChatFlowNode, ConnectorFlowEdge } from './types';
import { OUT_RIGHT_HANDLE } from './types';

const nodeTypes = { chat: ChatNode };
const edgeTypes = { connector: ConnectorEdge };
const NODE_HALF_WIDTH = 130;
const NODE_TITLE_OFFSET = 40;

const isValidConnection: IsValidConnection<ConnectorFlowEdge> = (c) => c.source !== c.target;

export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    beforeDelete,
    connect,
    record,
    addEmptyNodeAndConnect,
    arranging,
    dragElement,
    rightPanel,
    setRightPanel,
  } = useBuilder();
  const theme = useTheme();
  const { screenToFlowPosition } = useReactFlow<ChatFlowNode, ConnectorFlowEdge>();
  // React Flow re-runs fitView when the first nodes appear; only fit when the flow mounts with content.
  const [fitOnMount] = useState(nodes.length > 0);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || state.toNode || !state.fromNode) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      const p = screenToFlowPosition({ x: point.clientX, y: point.clientY });
      const handle = state.fromHandle?.id ?? null;
      const at = handle === OUT_RIGHT_HANDLE ? { x: p.x + 8, y: p.y - NODE_TITLE_OFFSET } : { x: p.x - NODE_HALF_WIDTH, y: p.y + 8 };
      addEmptyNodeAndConnect(state.fromNode.id, handle, at);
    },
    [screenToFlowPosition, addEmptyNodeAndConnect],
  );

  return (
    <div className={`cb-canvas${dragElement ? ' is-dragging-element' : ''}${arranging ? ' is-arranging' : ''}`}>
      <ArrowMarkers />
      <ReactFlow<ChatFlowNode, ConnectorFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={theme}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onBeforeDelete={beforeDelete}
        onConnect={connect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionLineComponent={ConnectionLine}
        connectionRadius={36}
        onNodeDragStart={record}
        onNodeClick={(_, node) => {
          // Functional update: an element settings click inside the node has already pointed the panel at it.
          setRightPanel((p) => (p.kind === 'nodeDetails' && p.nodeId !== node.id ? { kind: 'nodeDetails', nodeId: node.id } : p));
        }}
        onPaneClick={() => {
          if (rightPanel.kind === 'nodeDetails') setRightPanel({ kind: 'none' });
        }}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.25}
        maxZoom={2}
        panOnScroll
        zoomOnPinch
        fitView={fitOnMount}
        fitViewOptions={FIT_VIEW}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={2} color="var(--canvas-dot)" bgColor="var(--surface-canvas)" />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="cb-canvas__empty" aria-hidden>
          <MousePointerClick size={28} />
          <p className="t-body1-heavy">Start your flow</p>
          <p className="t-body2 t-secondary">Drag a Text element from the left panel and drop it here to create your first node.</p>
        </div>
      )}
    </div>
  );
}
