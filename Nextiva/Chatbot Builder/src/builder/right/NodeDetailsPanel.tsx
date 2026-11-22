import { Button, Inset, Panel, Tag, TextField } from '../../design-system';
import { elementSpec } from '../elements';
import { useBuilder } from '../store';
import { ElementEditor, ElementPromptEditor } from './ElementEditor';

export function NodeDetailsPanel({ nodeId, elementId, buttonId }: { nodeId: string; elementId?: string; buttonId?: string }) {
  const { nodes, setRightPanel, updateNodeData, record, requestDeleteNode, openTest } = useBuilder();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const element = node.data.elements.find((el) => el.id === elementId);
  const button = element?.buttons?.find((b) => b.id === buttonId);

  return (
    <div className="cb-right__stack">
      <Panel
        title="Node details"
        onBack={() => setRightPanel({ kind: 'nodes' })}
        onClose={() => setRightPanel({ kind: 'none' })}
        footer={
          <>
            <Button variant="link-danger" onClick={() => requestDeleteNode(nodeId)}>
              Delete node
            </Button>
            <Button variant="link" onClick={() => openTest(nodeId)}>
              Test
            </Button>
          </>
        }
      >
        <TextField
          label="Node name"
          value={node.data.name}
          placeholder={node.data.fallbackName}
          onFocus={record}
          onChange={(e) => updateNodeData(nodeId, { name: e.target.value })}
        />
        <Inset title="Elements" dense>
          {node.data.elements.length ? (
            <div className="cb-tags">
              {node.data.elements.map((el) => (
                <Tag
                  key={el.id}
                  selected={el.id === elementId}
                  onClick={() => setRightPanel({ kind: 'nodeDetails', nodeId, elementId: el.id })}
                >
                  {elementSpec(el.type).label}
                </Tag>
              ))}
            </div>
          ) : (
            <p className="t-caption t-secondary" style={{ margin: 0 }}>
              Drag elements from the left panel onto this node.
            </p>
          )}
        </Inset>
      </Panel>
      {element && button ? (
        <ElementPromptEditor
          key={button.id}
          nodeId={nodeId}
          element={element}
          button={button}
          onClose={() => setRightPanel({ kind: 'nodeDetails', nodeId, elementId: element.id })}
        />
      ) : (
        element && (
          <ElementEditor nodeId={nodeId} element={element} onClose={() => setRightPanel({ kind: 'nodeDetails', nodeId })} />
        )
      )}
    </div>
  );
}
