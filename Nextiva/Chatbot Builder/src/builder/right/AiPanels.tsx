import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import shareNodeMutedIcon from '../../assets/buttons/share-node-muted.svg';
import { Button, IconButton, Inset, Panel, Select, Tag, TextField } from '../../design-system';
import { useBuilder } from '../store';
import type { AiPrompt } from '../types';
import { nodeLabel } from '../types';
import { uid } from '../uid';

const MIN_UTTERANCES = 4;

export function AiPromptsPanel() {
  const { prompts, nodes, setRightPanel, showToast } = useBuilder();
  return (
    <Panel
      title="AI prompts"
      onClose={() => setRightPanel({ kind: 'none' })}
      footer={
        <>
          <Button variant="link" onClick={() => showToast('Bulk upload isn’t part of this prototype')}>
            Bulk upload AI prompts
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setRightPanel({
                kind: 'promptDetails',
                isNew: true,
                draft: { id: uid('prompt'), name: `Prompt ${prompts.length + 1}`, keyword: '', alternatives: [''], nodeId: '' },
              })
            }
          >
            Add prompt
          </Button>
        </>
      }
    >
      {prompts.length ? (
        <div className="cb-tags">
          {prompts.map((p) => {
            const live = Boolean(nodes.find((n) => n.id === p.nodeId)?.data.aiEnabled);
            return (
              <Tag
                key={p.id}
                icon={<Sparkles size={14} />}
                badge={live ? <Sparkles size={10} /> : undefined}
                badgeLabel={live ? 'Live on a node' : undefined}
                onClick={() => setRightPanel({ kind: 'promptDetails', isNew: false, draft: p })}
              >
                {p.name}
              </Tag>
            );
          })}
        </div>
      ) : (
        <p className="t-caption t-secondary" style={{ margin: 0 }}>
          No AI prompts yet. Turn on “Enable AI” on a node to let customers reach it by typing.
        </p>
      )}
    </Panel>
  );
}

export function PromptDetailsPanel({ draft, isNew }: { draft: AiPrompt; isNew: boolean }) {
  const { nodes, savePrompt, deletePrompt, setRightPanel } = useBuilder();
  const [form, setForm] = useState<AiPrompt>(() => ({
    ...draft,
    alternatives: draft.alternatives.length ? draft.alternatives : [''],
  }));
  const [view, setView] = useState<'setup' | 'intent'>('setup');
  const [error, setError] = useState<string | null>(null);

  const set = (p: Partial<AiPrompt>) => {
    setError(null);
    setForm((f) => ({ ...f, ...p }));
  };
  const setAlt = (i: number, value: string) => set({ alternatives: form.alternatives.map((a, j) => (j === i ? value : a)) });

  const save = () => {
    if (!form.keyword.trim()) return setError('Add a keyword or phrase customers might type.');
    if (!form.nodeId) return setError('Choose the node this prompt should lead to.');
    savePrompt({ ...form, name: form.name.trim() || form.keyword.trim(), alternatives: form.alternatives.filter((a) => a.trim()) });
    setRightPanel({ kind: 'ai' });
  };

  const nodeSelect = (
    <Select
      label="Connected node"
      help="The node the bot jumps to when a customer’s message matches"
      placeholder="Select a node"
      value={form.nodeId}
      icon={<img src={shareNodeMutedIcon} alt="" width={24} height={24} />}
      options={nodes.map((n) => ({ value: n.id, label: nodeLabel(n.data) }))}
      onChange={(nodeId) => set({ nodeId })}
    />
  );
  const errorLine = error && (
    <p role="alert" className="t-caption cb-error">
      {error}
    </p>
  );

  if (view === 'intent') {
    return (
      <IntentView
        form={form}
        set={set}
        onBack={() => {
          set({ alternatives: form.alternatives.filter((a) => a.trim()).length ? form.alternatives.filter((a) => a.trim()) : [''] });
          setView('setup');
        }}
        onCancel={() => setRightPanel({ kind: 'ai' })}
        onClose={() => setRightPanel({ kind: 'none' })}
        onSave={save}
        nodeSelect={form.nodeId ? null : nodeSelect}
        error={errorLine}
      />
    );
  }

  return (
    <Panel
      title="Prompt details"
      onBack={() => setRightPanel({ kind: 'ai' })}
      onClose={() => setRightPanel({ kind: 'none' })}
      footer={
        <>
          <Button
            variant="link-danger"
            disabled={isNew}
            onClick={() => {
              deletePrompt(form.id);
              setRightPanel({ kind: 'ai' });
            }}
          >
            Delete prompt
          </Button>
          <Button variant="link" onClick={() => setView('intent')}>
            Advanced
          </Button>
        </>
      }
    >
      <TextField label="Prompt name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      <Inset title="Setup AI prompt">
        <p className="t-caption t-secondary" style={{ margin: 0 }}>
          Explain how user can reach to a particular node with text input.
        </p>
        <TextField
          label="Keyword/phrase"
          required
          help="The main word or phrase a customer types to reach this node"
          placeholder="Write keyword or phrase"
          value={form.keyword}
          autoFocus={isNew}
          onChange={(e) => set({ keyword: e.target.value })}
        />
        {form.alternatives.map((alt, i) => (
          <div key={i} className="cb-alt-row">
            <TextField
              label="Alternative word/phrase"
              placeholder="Write keyword or phrase"
              value={alt}
              onChange={(e) => setAlt(i, e.target.value)}
              fieldClassName="cb-alt-row__field"
            />
            <IconButton
              label="Remove alternative"
              size={24}
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => set({ alternatives: form.alternatives.length > 1 ? form.alternatives.filter((_, j) => j !== i) : [''] })}
            />
            {i === form.alternatives.length - 1 ? (
              <IconButton
                label="Add alternative"
                size={24}
                className="cb-alt-row__add"
                icon={<Plus size={16} />}
                onClick={() => set({ alternatives: [...form.alternatives, ''] })}
              />
            ) : (
              <span className="cb-alt-row__spacer" />
            )}
          </div>
        ))}
        {errorLine}
        <div className="cb-inset-actions">
          <Button variant="muted" size="sm" onClick={() => setRightPanel({ kind: 'ai' })}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={save}>
            Save
          </Button>
        </div>
      </Inset>
      {nodeSelect}
    </Panel>
  );
}

/** The "intent + utterances" layout of the same prompt (Figma: Right Panel V2 / AI 2). */
function IntentView({
  form,
  set,
  onBack,
  onCancel,
  onClose,
  onSave,
  nodeSelect,
  error,
}: {
  form: AiPrompt;
  set: (p: Partial<AiPrompt>) => void;
  onBack: () => void;
  onCancel: () => void;
  onClose: () => void;
  onSave: () => void;
  nodeSelect: ReactNode;
  error: ReactNode;
}) {
  const filled = [form.keyword, ...form.alternatives];
  const [rows, setRows] = useState(Math.max(MIN_UTTERANCES, filled.filter((u) => u.trim()).length));
  const utterances = Array.from({ length: rows }, (_, i) => filled[i] ?? '');
  const setUtterance = (i: number, value: string) => {
    const next = utterances.map((u, j) => (j === i ? value : u));
    set({ keyword: next[0], alternatives: next.slice(1) });
  };
  const canSave = Boolean(form.name.trim() && utterances.some((u) => u.trim()));

  return (
    <Panel title="Prompt details" onBack={onBack} onClose={onClose}>
      <div className="cb-intent">
        <section className="cb-intent__group">
          <div className="cb-intent__head">
            <h3 className="cb-intent__title">Intent name</h3>
            <p className="cb-intent__desc">Intent is describing the users overall goal or what they hope to achieve.</p>
          </div>
          <TextField aria-label="Intent name" placeholder="Enter name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </section>
        <section className="cb-intent__group">
          <div className="cb-intent__head">
            <h3 className="cb-intent__title">Add utterances</h3>
            <p className="cb-intent__desc">These are phrases the user might say to describe their intended goal.</p>
          </div>
          {utterances.map((u, i) => (
            <TextField key={i} aria-label={`Sample ${i + 1}`} placeholder={`Sample ${i + 1}`} value={u} onChange={(e) => setUtterance(i, e.target.value)} />
          ))}
          <Button variant="ghost-secondary" size="sm" className="cb-intent__more" icon={<Plus size={16} />} onClick={() => setRows((r) => r + 1)}>
            Add utterances
          </Button>
        </section>
        {nodeSelect}
        {error}
        <div className="cb-intent__actions">
          <Button variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={onSave} style={{ minWidth: 80 }}>
            Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}
