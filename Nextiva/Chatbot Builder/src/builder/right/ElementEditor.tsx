import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, CirclePlay, Image, Info, Mail, Plus, Sparkles, Trash2, Type } from 'lucide-react';
import deleteIcon from '../../assets/buttons/delete.svg';
import glyphIcon from '../../assets/buttons/glyph.svg';
import linkActiveIcon from '../../assets/buttons/link-active.svg';
import linkIcon from '../../assets/buttons/link.svg';
import nodeIcon from '../../assets/buttons/node.svg';
import shareNodeMutedIcon from '../../assets/buttons/share-node-muted.svg';
import shareNodeIcon from '../../assets/buttons/share-node.svg';
import unlinkIcon from '../../assets/buttons/unlink.svg';
import lockClosedIcon from '../../assets/connector/lock-closed.svg';
import lockIcon from '../../assets/connector/lock.svg';
import { Button, cx, MaskIcon, Panel, Select, TextField } from '../../design-system';
import { createButton, elementSpec } from '../elements';
import { useMediaPicker } from '../MediaTiles';
import { elementHtml, htmlToText } from '../richText';
import { useBuilder } from '../store';
import type { ButtonItem, ButtonKind, ButtonLook, NodeElement } from '../types';
import { buttonHandleId, nodeLabel } from '../types';
import { useDismiss } from '../useDismiss';
import { MediaEditor } from './MediaEditor';
import { NodeChip } from './NodesPanels';
import { RichTextEditor } from './RichTextEditor';
import { CarouselEditor } from './CarouselEditor';
import { CollectEditor, isCollectInput } from './CollectEditor';
import { EmbedEditor } from './EmbedEditor';
import { FeedbackEditor } from './FeedbackEditor';
import { TransferEditor } from './TransferEditor';
import { UserInputEditor } from './UserInputEditor';

const DETAIL_LABEL: Partial<Record<NodeElement['type'], string>> = {
  api: 'Endpoint URL',
  dataDisplay: 'Insert source link',
};

export function ElementEditor({ nodeId, element, onClose }: { nodeId: string; element: NodeElement; onClose: () => void }) {
  const { updateElement, requestDeleteElement, record, openTest, showToast } = useBuilder();
  const spec = elementSpec(element.type);
  const patch = (p: Partial<NodeElement>) => updateElement(nodeId, element.id, p);
  const hasCard =
    element.type !== 'text' &&
    element.type !== 'buttons' &&
    element.type !== 'media' &&
    element.type !== 'userInput' &&
    element.type !== 'feedback' &&
    element.type !== 'carousel' &&
    element.type !== 'embed' &&
    element.type !== 'transfer' &&
    !isCollectInput(element.type);

  return (
    <Panel
      tone="secondary"
      title={spec.label}
      aria-label={`${spec.label} settings`}
      onClose={onClose}
      footer={
        element.type === 'embed' ? (
          <>
            <Button variant="link-danger" icon={<Trash2 size={14} />} onClick={() => requestDeleteElement(nodeId, element.id)}>
              Delete element
            </Button>
            <Button
              variant="link"
              disabled={!element.script?.trim()}
              onClick={() => showToast(element.text?.trim() ? `“${element.text.trim()}” is implemented.` : 'Script is implemented.')}
            >
              Implement
            </Button>
          </>
        ) : element.type === 'userInput' || element.type === 'feedback' || element.type === 'carousel' ? (
          <Button className={element.type === 'feedback' ? 'cb-rate__link' : undefined} variant="link-danger" icon={<Trash2 size={14} />} onClick={() => requestDeleteElement(nodeId, element.id)}>
            Delete element
          </Button>
        ) : (
          <>
            <Button variant="link-danger" onClick={() => requestDeleteElement(nodeId, element.id)}>
              Delete element
            </Button>
            <Button variant="link" onClick={() => openTest(nodeId)}>
              Test
            </Button>
          </>
        )
      }
    >
      {element.type === 'text' && (
        <RichTextEditor html={elementHtml(element)} onChange={(html) => patch({ html, text: htmlToText(html) })} onFocus={record} />
      )}
      {element.type === 'buttons' && <ButtonsEditor nodeId={nodeId} element={element} patch={patch} record={record} />}
      {element.type === 'media' && <MediaEditor element={element} patch={patch} record={record} />}
      {element.type === 'userInput' && <UserInputEditor nodeId={nodeId} element={element} patch={patch} record={record} />}
      {element.type === 'feedback' && <FeedbackEditor nodeId={nodeId} element={element} patch={patch} record={record} />}
      {element.type === 'carousel' && <CarouselEditor element={element} patch={patch} record={record} />}
      {element.type === 'embed' && <EmbedEditor element={element} patch={patch} record={record} />}
      {element.type === 'transfer' && <TransferEditor element={element} patch={patch} record={record} />}
      {isCollectInput(element.type) && <CollectEditor element={element} patch={patch} record={record} />}
      {hasCard && (
        <div className="cb-edit-card">
          {DETAIL_LABEL[element.type] && (
            <TextField
              label={DETAIL_LABEL[element.type]}
              value={element.text ?? ''}
              onFocus={record}
              onChange={(e) => patch({ text: e.target.value })}
            />
          )}
          {(element.type === 'dataDisplay' || element.type === 'api') && (
            <Button
              variant="outline"
              className="cb-edit-card__action"
              disabled={!element.text?.trim()}
              onClick={() => showToast(element.type === 'api' ? 'Endpoint is ready.' : 'Source link is ready.')}
            >
              {element.type === 'api' ? 'Validate endpoint' : 'Validate source'}
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

const ADD_OPTIONS: { look: ButtonLook; label: string; icon: ReactNode }[] = [
  { look: 'text', label: 'Text button', icon: <Type size={16} /> },
  { look: 'media', label: 'Media button', icon: <CirclePlay size={16} /> },
  { look: 'icon', label: 'Icon button', icon: <Info size={16} /> },
];

function ButtonsEditor({
  nodeId,
  element,
  patch,
  record,
}: {
  nodeId: string;
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  const buttons = element.buttons ?? [];
  const update = (id: string, p: Partial<ButtonItem>) => patch({ buttons: buttons.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const add = (look: ButtonLook) => {
    record();
    patch({ buttons: [...buttons, createButton(buttons.length, look)] });
  };

  return (
    <div className="cb-btn-editor">
      {buttons.map((b, i) => (
        <ButtonCard
          key={b.id}
          index={i}
          nodeId={nodeId}
          button={b}
          record={record}
          update={(p) => update(b.id, p)}
          remove={() => {
            record();
            patch({ buttons: buttons.filter((x) => x.id !== b.id) });
          }}
        />
      ))}
      <AddButtonGroup onAdd={add} />
    </div>
  );
}

function ButtonCard({
  index,
  nodeId,
  button: b,
  record,
  update,
  remove,
}: {
  index: number;
  nodeId: string;
  button: ButtonItem;
  record: () => void;
  update: (p: Partial<ButtonItem>) => void;
  remove: () => void;
}) {
  const { nodes, edges, connect, focusNode, deleteEdge, toggleEdgeLock, showToast } = useBuilder();
  const look = b.look ?? 'text';
  const isLink = b.kind !== 'node';
  const handle = buttonHandleId(b.id);
  const edge = edges.find((e) => e.source === nodeId && e.sourceHandle === handle);
  const target = nodes.find((n) => n.id === edge?.target);
  const locked = Boolean(edge?.data?.locked);
  const name = `Button ${index + 1}`;
  const picker = useMediaPicker((items) => {
    const image = items[0]?.src;
    if (!image) return;
    record();
    update({ image });
  });

  const setKind = (kind: ButtonKind) => {
    if (kind === 'node') {
      if (b.kind === 'node') return;
      record();
      update({ kind: 'node' });
      return;
    }
    if (b.kind === 'link' || b.kind === 'email') return;
    if (edge?.data?.locked) {
      showToast('That connector is locked. Unlock it to reconnect.');
      return;
    }
    if (edge) deleteEdge(edge.id);
    else record();
    update({ kind: 'link' });
  };

  const unlink = () => {
    if (!edge) return;
    if (edge.data?.locked) {
      showToast('That connector is locked. Unlock it to reconnect.');
      return;
    }
    deleteEdge(edge.id);
  };

  return (
    <div className={cx('cb-btn-card', isLink ? 'is-link' : 'is-node', look === 'media' && 'is-media', look === 'icon' && 'is-icon')}>
      <div className="cb-btn-card__modes">
        <button type="button" className="cb-btn-card__icon" aria-label="Connect to a node" aria-pressed={!isLink} onClick={() => setKind('node')}>
          <img src={isLink ? shareNodeMutedIcon : shareNodeIcon} alt="" width={24} height={24} />
        </button>
        <button type="button" className="cb-btn-card__icon" aria-label="Open a link" aria-pressed={isLink} onClick={() => setKind('link')}>
          <img src={isLink ? linkActiveIcon : linkIcon} alt="" width={24} height={24} />
        </button>
      </div>
      <div className="cb-btn-card__body">
        {look === 'media' ? (
          <button type="button" className="cb-btn-card__image" onClick={picker.open} aria-label={b.image ? 'Replace button image' : 'Upload button image'}>
            {b.image ? <img src={b.image} alt="" /> : <Image size={20} />}
          </button>
        ) : (
          <div className={cx('cb-btn-card__name', look === 'icon' && 'has-icon')}>
            {look === 'icon' && (
              <span className="cb-btn-card__glyph">
                <img src={glyphIcon} alt="" width={14} height={12} />
                <ChevronDown size={16} />
              </span>
            )}
            <TextField
              aria-label={`${name} label`}
              className="cb-btn-card__field"
              value={b.label}
              placeholder="Button name"
              onFocus={record}
              onChange={(e) => update({ label: e.target.value })}
            />
          </div>
        )}
        {isLink ? (
          <TextField
            aria-label={b.kind === 'email' ? `${name} email address` : `${name} website`}
            className="cb-btn-card__field cb-btn-card__link"
            leading={b.kind === 'email' ? <Mail size={14} /> : <img src={linkIcon} alt="" width={24} height={24} />}
            value={b.url ?? ''}
            placeholder={b.kind === 'email' ? 'name@company.com' : 'Enter URL'}
            onFocus={record}
            onChange={(e) => update({ url: e.target.value })}
          />
        ) : target && edge ? (
          <div className="cb-btn-card__node">
            <button type="button" className="cb-btn-card__target" onClick={() => focusNode(target.id)} title="Show on canvas">
              <span className="cb-btn-card__tile">
                <MaskIcon src={nodeIcon} width={14} height={14} />
              </span>
              <b>{nodeLabel(target.data)}</b>
            </button>
            <span className="cb-btn-card__node-actions">
              {look !== 'text' && (
                <button
                  type="button"
                  className="cb-btn-card__icon"
                  aria-label={locked ? 'Unlock connector' : 'Lock connector'}
                  onClick={() => toggleEdgeLock(edge.id)}
                >
                  <img src={locked ? lockClosedIcon : lockIcon} alt="" width={24} height={24} />
                </button>
              )}
              <button type="button" className="cb-btn-card__icon" aria-label="Disconnect node" onClick={unlink}>
                <img src={unlinkIcon} alt="" width={24} height={24} />
              </button>
            </span>
          </div>
        ) : (
          <Select
            aria-label={`${name} connected node`}
            placeholder="Connect to a node"
            value=""
            icon={<img src={shareNodeMutedIcon} alt="" width={24} height={24} />}
            options={nodes.filter((n) => n.id !== nodeId).map((n) => ({ value: n.id, label: nodeLabel(n.data) }))}
            onChange={(t) => connect({ source: nodeId, sourceHandle: handle, target: t, targetHandle: null })}
          />
        )}
      </div>
      <button type="button" className="cb-btn-card__trash" aria-label={`Delete ${name}`} onClick={remove}>
        <img src={deleteIcon} alt="" width={24} height={24} />
      </button>
      {look === 'media' && picker.input}
    </div>
  );
}

function AddButtonGroup({ onAdd }: { onAdd: (look: ButtonLook) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, useCallback(() => setOpen(false), []));

  return (
    <div className="cb-add-btn" ref={ref}>
      <div className="cb-add-btn__bar">
        <button type="button" className="cb-add-btn__main" onClick={() => onAdd('text')}>
          <Plus size={16} />
          Add button
        </button>
        <span className="cb-add-btn__divider" aria-hidden />
        <button
          type="button"
          className="cb-add-btn__menu"
          aria-label="Choose button type"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div className="ds-menu" role="menu">
          {ADD_OPTIONS.map((o) => (
            <button
              key={o.look}
              type="button"
              role="menuitem"
              className="ds-menu__item"
              onClick={() => {
                onAdd(o.look);
                setOpen(false);
              }}
            >
              <span className="ds-menu__icon">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ElementPromptEditor({
  nodeId,
  element,
  button,
  onClose,
}: {
  nodeId: string;
  element: NodeElement;
  button: ButtonItem;
  onClose: () => void;
}) {
  const { nodes, edges, updateElement, record, setNodeAi, focusNode } = useBuilder();
  const [value, setValue] = useState(button.prompt ?? '');
  const buttons = element.buttons ?? [];
  const index = buttons.findIndex((b) => b.id === button.id);
  const targetId = edges.find((e) => e.source === nodeId && e.sourceHandle === buttonHandleId(button.id))?.target;
  const target = nodes.find((n) => n.id === targetId);
  const dirty = value.trim() !== (button.prompt ?? '');

  const setPrompt = (prompt: string | undefined) => {
    record();
    updateElement(nodeId, element.id, { buttons: buttons.map((b) => (b.id === button.id ? { ...b, prompt } : b)) });
  };

  return (
    <Panel
      tone="secondary"
      icon={<Sparkles size={14} />}
      title={`Button ${index + 1}`}
      aria-label={`Element prompt for ${button.label}`}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="link-danger"
            disabled={!button.prompt}
            onClick={() => {
              setPrompt(undefined);
              onClose();
            }}
          >
            Delete prompt
          </Button>
          <Button variant="link" disabled={!target} onClick={() => target && setNodeAi(target.id, true)}>
            Setup AI for connected node
          </Button>
        </>
      }
    >
      <TextField
        label="Element prompt"
        placeholder="Write keyword or phrase"
        help={`What a customer can type instead of tapping “${button.label}”`}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && dirty) {
            setPrompt(value.trim() || undefined);
            onClose();
          }
        }}
      />
      <div className="cb-inset-actions">
        <Button variant="muted" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!dirty}
          onClick={() => {
            setPrompt(value.trim() || undefined);
            onClose();
          }}
        >
          Save
        </Button>
      </div>
      <div className="ds-field">
        <span className="ds-field__label t-overline t-overline--heavy">Connected node</span>
        {target ? (
          <div className="cb-tags">
            <NodeChip node={target} onClick={() => focusNode(target.id)} />
          </div>
        ) : (
          <p className="t-caption t-secondary" style={{ margin: 0 }}>
            Connect “{button.label}” to a node first.
          </p>
        )}
      </div>
    </Panel>
  );
}
