import { Play, Share2, Sparkles } from 'lucide-react';
import { IconButton, SearchField } from '../../design-system';
import { useBuilder } from '../store';
import { AiPromptsPanel, PromptDetailsPanel } from './AiPanels';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import { NodesPanel, SearchPanel } from './NodesPanels';
import { TestPanel } from './TestPanel';

export function RightMenu() {
  const { rightPanel, setRightPanel, openTest, searchQuery, setSearchQuery, setTestActiveNodeId } = useBuilder();
  const k = rightPanel.kind;

  const toggle = (kind: 'nodes' | 'ai') => setRightPanel(k === kind ? { kind: 'none' } : { kind });

  return (
    <div className="cb-right">
      <div className="cb-right__menu">
        <div className="cb-right__icons" role="toolbar" aria-label="Builder tools">
          <IconButton
            label="Test chatbot"
            size={24}
            icon={<Play size={16} />}
            variant={k === 'test' ? 'active' : 'plain'}
            onClick={() => {
              if (k === 'test') {
                setRightPanel({ kind: 'none' });
                setTestActiveNodeId(null);
              } else openTest();
            }}
          />
          <IconButton
            label="Nodes"
            size={24}
            icon={<Share2 size={16} />}
            variant={k === 'nodes' || k === 'nodeDetails' || k === 'search' ? 'active' : 'plain'}
            onClick={() => toggle('nodes')}
          />
          <IconButton
            label="AI prompts"
            size={24}
            icon={<Sparkles size={16} />}
            variant={k === 'ai' || k === 'promptDetails' ? 'active' : 'plain'}
            onClick={() => toggle('ai')}
          />
        </div>
        <div className="cb-right__search">
          <SearchField
            size="sm"
            placeholder="Search"
            value={searchQuery}
            onChange={(q) => {
              setSearchQuery(q);
              setRightPanel(q ? { kind: 'search' } : { kind: 'nodes' });
            }}
            onFocus={() => searchQuery && setRightPanel({ kind: 'search' })}
          />
        </div>
      </div>

      {k === 'nodes' && <NodesPanel />}
      {k === 'search' && <SearchPanel />}
      {k === 'nodeDetails' && <NodeDetailsPanel nodeId={rightPanel.nodeId} elementId={rightPanel.elementId} buttonId={rightPanel.buttonId} />}
      {k === 'ai' && <AiPromptsPanel />}
      {k === 'promptDetails' && <PromptDetailsPanel key={rightPanel.draft.id} draft={rightPanel.draft} isNew={rightPanel.isNew} />}
      {k === 'test' && (
        <TestPanel key={rightPanel.runId} startNodeId={rightPanel.startNodeId} mode={rightPanel.mode} runId={rightPanel.runId} />
      )}
    </div>
  );
}
