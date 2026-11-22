import { Share2, Sparkles } from 'lucide-react';
import { Panel, Tag } from '../../design-system';
import { useBuilder } from '../store';
import type { ChatFlowNode } from '../types';
import { nodeLabel } from '../types';

export function NodeChip({ node, onClick }: { node: ChatFlowNode; onClick?: () => void }) {
  return (
    <Tag
      icon={<Share2 size={14} />}
      badge={node.data.aiEnabled ? <Sparkles size={10} /> : undefined}
      badgeLabel={node.data.aiEnabled ? 'AI enabled' : undefined}
      static={!onClick}
      onClick={onClick}
    >
      {nodeLabel(node.data)}
    </Tag>
  );
}

function NodeChips({ nodes }: { nodes: ChatFlowNode[] }) {
  const { focusNode, openNodeDetails } = useBuilder();
  return (
    <div className="cb-tags">
      {nodes.map((n) => (
        <NodeChip
          key={n.id}
          node={n}
          onClick={() => {
            focusNode(n.id);
            openNodeDetails(n.id);
          }}
        />
      ))}
    </div>
  );
}

export function NodesPanel() {
  const { nodes, setRightPanel } = useBuilder();
  return (
    <Panel title="Nodes" onClose={() => setRightPanel({ kind: 'none' })}>
      {nodes.length ? (
        <NodeChips nodes={nodes} />
      ) : (
        <p className="t-caption t-secondary">No nodes yet. Drag an element onto the canvas to create one.</p>
      )}
    </Panel>
  );
}

export function SearchPanel() {
  const { nodes, searchQuery, setSearchQuery, setRightPanel } = useBuilder();
  const q = searchQuery.trim().toLowerCase();
  const matches = nodes.filter(
    (n) =>
      nodeLabel(n.data).toLowerCase().includes(q) ||
      n.data.elements.some(
        (el) =>
          el.text?.toLowerCase().includes(q) || el.buttons?.some((b) => b.label.toLowerCase().includes(q)),
      ),
  );
  return (
    <Panel
      title="Search results"
      onClose={() => {
        setSearchQuery('');
        setRightPanel({ kind: 'none' });
      }}
    >
      {matches.length ? (
        <NodeChips nodes={matches} />
      ) : (
        <p className="t-caption t-secondary">No nodes match “{searchQuery}”.</p>
      )}
    </Panel>
  );
}
