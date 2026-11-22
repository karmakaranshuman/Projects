import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import { Copy, Play, Plus, Settings, Sparkles, Trash2 } from 'lucide-react';
import { cx, ElementIcon, IconButton, Toggle } from '../../design-system';
import { useBuilder } from '../store';
import type { ChatFlowNode } from '../types';
import { isStaticNode } from '../elements';
import { OUT_HANDLE, OUT_RIGHT_HANDLE, nodeLabel } from '../types';
import { NodeElementView } from './NodeElementView';

function ChatNodeImpl({ id, data, selected }: NodeProps<ChatFlowNode>) {
  const {
    rightPanel,
    openNodeDetails,
    openTest,
    duplicateNode,
    requestDeleteNode,
    updateNodeData,
    setNodeAi,
    setRightPanel,
    prompts,
    testActiveNodeId,
    dropTarget,
    record,
  } = useBuilder();
  const connection = useConnection();
  const [editingName, setEditingName] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected && data.isNew) updateNodeData(id, { isNew: false });
  }, [selected, data.isNew, id, updateNodeData]);

  useEffect(() => {
    if (editingName) nameRef.current?.select();
  }, [editingName]);

  const prompt = prompts.find((p) => p.id === data.promptId);
  const draftForThisNode = rightPanel.kind === 'promptDetails' && rightPanel.draft.nodeId === id;
  const aiChecked = data.aiEnabled || (draftForThisNode && rightPanel.kind === 'promptDetails' && rightPanel.isNew);
  // The highlight belongs to the right panel: it shows while this node is being edited or tested and clears when that panel closes.
  const highlight: 'edit' | 'ai' | 'test' | null =
    rightPanel.kind === 'nodeDetails' && rightPanel.nodeId === id
      ? 'edit'
      : draftForThisNode
        ? 'ai'
        : rightPanel.kind === 'test' && testActiveNodeId === id
          ? 'test'
          : null;
  const isStatic = isStaticNode(data.elements);
  // Button nodes connect from each button. An input with a condition connects from True and False.
  const buttonNode = data.elements.some((el) => el.type === 'buttons');
  const branchedInput = data.elements.some((el) => (el.type === 'userInput' || el.type === 'feedback') && el.condition);
  const showTarget = connection.inProgress && connection.fromNode?.id !== id;
  const drop = dropTarget?.nodeId === id && dropTarget.allowed ? 'ok' : null;
  const showNameInput = editingName || (data.isNew && selected);

  return (
    <div
      className={cx(
        'cb-node',
        isStatic ? 'is-static' : 'is-interactive',
        highlight && 'is-active',
        drop === 'ok' && 'is-drop-target',
        data.isNew && 'is-new',
      )}
    >
      <Handle
        type="target"
        id="in"
        position={Position.Top}
        isConnectableStart={false}
        className={cx('cb-node__target', showTarget && 'is-connecting')}
      />

      {highlight ? (
        <div className="cb-node__badge nodrag">
          {highlight === 'ai' ? (
            <IconButton label="Editing AI prompt" variant="filled" size={32} icon={<Sparkles size={16} />} />
          ) : highlight === 'test' ? (
            <IconButton label="Testing this node" variant="filled" size={32} icon={<Play size={16} />} onClick={() => openTest(id)} />
          ) : (
            <IconButton label="Node settings" variant="filled" size={32} icon={<Settings size={16} />} onClick={() => openNodeDetails(id)} />
          )}
        </div>
      ) : (
        <div className="cb-node__menu nodrag" role="toolbar" aria-label="Node actions">
          <IconButton label="Node settings" size={24} icon={<Settings size={14} />} onClick={() => openNodeDetails(id)} />
          <IconButton label="Test from this node" size={24} icon={<Play size={14} />} onClick={() => openTest(id)} />
          <IconButton label="Duplicate node" size={24} icon={<Copy size={14} />} onClick={() => duplicateNode(id)} />
          <IconButton label="Delete node" size={24} variant="danger" icon={<Trash2 size={14} />} onClick={() => requestDeleteNode(id)} />
        </div>
      )}

      <div className="cb-node__title">
        {showNameInput ? (
          <input
            ref={nameRef}
            className="cb-node__name-input nodrag"
            value={data.name}
            placeholder={data.fallbackName}
            aria-label="Node name"
            onFocus={record}
            onChange={(e) => updateNodeData(id, { name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <span className="cb-node__name" title="Double-click to rename" onDoubleClick={() => setEditingName(true)}>
            {nodeLabel(data)}
          </span>
        )}
      </div>

      <div className="cb-node__elements">
        {data.elements.length ? (
          data.elements.map((el, i) => (
            <NodeElementView
              key={el.id}
              nodeId={id}
              element={el}
              autoEdit={Boolean(data.isNew && i === 0)}
              nodeSelected={Boolean(selected)}
              onSettings={() => openNodeDetails(id, el.id)}
            />
          ))
        ) : (
          <div className="cb-node__empty t-caption">Drag elements here</div>
        )}
      </div>

      <div className={cx('cb-node__ai', data.aiEnabled && prompt && 'is-on')}>
        {data.aiEnabled && prompt ? (
          <button
            type="button"
            className="cb-node__ai-label nodrag"
            onClick={() => setRightPanel({ kind: 'promptDetails', isNew: false, draft: prompt })}
          >
            <ElementIcon icon={Sparkles} family="ai" size="node" />
            <span>{prompt.name}</span>
          </button>
        ) : (
          <span className="cb-node__ai-label">
            <ElementIcon icon={Sparkles} family="plain" size="node" />
            <span>Enable AI</span>
          </span>
        )}
        <Toggle label={`Enable AI for ${nodeLabel(data)}`} checked={aiChecked} onChange={(on) => setNodeAi(id, on)} />
      </div>

      {!buttonNode && !branchedInput && (
        <>
          <Handle type="source" id={OUT_HANDLE} position={Position.Bottom} className="cb-handle cb-node__out" title="Drag to connect">
            <Plus size={10} strokeWidth={2.5} />
          </Handle>
          <Handle type="source" id={OUT_RIGHT_HANDLE} position={Position.Right} className="cb-handle cb-node__out cb-node__out--right" title="Drag to connect">
            <Plus size={10} strokeWidth={2.5} />
          </Handle>
        </>
      )}
    </div>
  );
}

export const ChatNode = memo(ChatNodeImpl);
