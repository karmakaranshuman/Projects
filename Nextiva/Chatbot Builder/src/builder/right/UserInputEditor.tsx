import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Building,
  Calendar,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CirclePlay,
  CircleX,
  Clock,
  CreditCard,
  Download,
  FileText,
  Flag,
  GitBranch,
  Globe,
  Hash,
  Landmark,
  List,
  Mail,
  MapPin,
  Phone,
  SquareCheck,
  Type,
  X,
} from 'lucide-react';
import nodeIcon from '../../assets/buttons/node.svg';
import shareNodeMutedIcon from '../../assets/buttons/share-node-muted.svg';
import unlinkIcon from '../../assets/buttons/unlink.svg';
import lockClosedIcon from '../../assets/connector/lock-closed.svg';
import lockIcon from '../../assets/connector/lock.svg';
import { Button, Divider, FieldShell, IconButton, MaskIcon, Select, TextArea, TextField, cx } from '../../design-system';
import { INPUT_GROUPS, INPUT_TYPES, inputSpec, type InputTypeSpec } from '../inputs';
import { useBuilder } from '../store';
import type { InputCondition, InputKind, InputRule, NodeElement } from '../types';
import { inputBranchHandle, nodeLabel } from '../types';
import { useDismiss } from '../useDismiss';
import { uid } from '../uid';

const MENU_ICONS: Record<InputKind, ReactNode> = {
  text: <Type size={16} />,
  numeric: <Hash size={16} />,
  media: <CirclePlay size={16} />,
  document: <FileText size={16} />,
  dropdown: <List size={16} />,
  checklist: <SquareCheck size={16} />,
  radio: <CircleDot size={16} />,
  date: <Calendar size={16} />,
  dateRange: <CalendarRange size={16} />,
  time: <Clock size={16} />,
  timeslot: <CalendarClock size={16} />,
  email: <Mail size={16} />,
  phone: <Phone size={16} />,
  website: <Globe size={16} />,
  address: <MapPin size={16} />,
  country: <Flag size={16} />,
  city: <Building size={16} />,
  zip: <Hash size={16} />,
  card: <CreditCard size={16} />,
  bank: <Landmark size={16} />,
};

const MENU_WIDTH = 184;

function KindTile({ spec, saved }: { spec: InputTypeSpec; saved?: boolean }) {
  // The city asset ships with its own tile background, so it can't be tinted with a mask.
  const mask = spec.kind !== 'city';
  const style: CSSProperties = {
    width: spec.w,
    height: spec.h,
    WebkitMaskImage: `url("${spec.icon}")`,
    maskImage: `url("${spec.icon}")`,
  };
  return (
    <span className={cx('cb-input-tile', saved && 'is-saved')}>
      {mask ? <span className="cb-input-tile__mask" style={style} /> : <img src={spec.icon} alt="" width={spec.w} height={spec.h} />}
    </span>
  );
}

function InputTypeField({ kind, onChange }: { kind: InputKind; onChange: (kind: InputKind) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    setGroup(null);
  }, []);
  useDismiss(root, open, close);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = root.current?.querySelector('button');
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const height = menu.scrollHeight;
      let left = rect.left;
      if (left + MENU_WIDTH > window.innerWidth - 8) left = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const flip = height + 2 > below && above > below;
      const top = flip ? Math.max(8, rect.top - Math.min(height, above) - 2) : rect.bottom + 2;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.style.maxHeight = `${Math.max(80, Math.min(360, flip ? above : below))}px`;
      const sub = subRef.current;
      if (!sub) return;
      // The settings panel sits on the right, so the submenu opens to the left of the main menu.
      let subLeft = left - sub.offsetWidth;
      if (subLeft < 8) subLeft = left + MENU_WIDTH;
      sub.style.left = `${subLeft}px`;
      sub.style.top = `${top}px`;
      sub.style.maxHeight = menu.style.maxHeight;
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, group]);

  const spec = inputSpec(kind);
  const active = INPUT_GROUPS.find((g) => g.id === group);

  return (
    <FieldShell label="Input type" htmlFor={id}>
      <div className="cb-type" ref={root}>
        <button
          id={id}
          type="button"
          className="ds-select__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span className="ds-select__value">{spec.field}</span>
          <ChevronDown size={16} className="ds-select__chevron" />
        </button>
        {open && (
          <div ref={menuRef} className="ds-menu cb-type-menu" role="menu" aria-label="Input type">
            {INPUT_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className="ds-menu__item"
                role="menuitem"
                aria-expanded={group === g.id}
                onMouseEnter={() => setGroup(g.id)}
                onFocus={() => setGroup(g.id)}
                onClick={() => setGroup(g.id)}
              >
                <span className="ds-menu__label">{g.label}</span>
                <ChevronRight size={16} className="cb-type-menu__caret" />
              </button>
            ))}
          </div>
        )}
        {open && active && (
          <div ref={subRef} className="ds-menu cb-type-menu cb-type-menu--sub" role="menu" aria-label={active.label}>
            {active.kinds.map((item) => (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={item === kind}
                className="ds-menu__item cb-type-menu__type"
                onClick={() => {
                  onChange(item);
                  close();
                }}
              >
                <span className="ds-menu__icon">{MENU_ICONS[item]}</span>
                <span className="ds-menu__label">{INPUT_TYPES[item].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </FieldShell>
  );
}

export function BranchLink({ nodeId, elementId, branch }: { nodeId: string; elementId: string; branch: 'true' | 'false' }) {
  const { nodes, edges, connect, deleteEdge, toggleEdgeLock, focusNode, showToast } = useBuilder();
  const handle = inputBranchHandle(elementId, branch);
  const edge = edges.find((e) => e.source === nodeId && e.sourceHandle === handle);
  const target = edge ? nodes.find((n) => n.id === edge.target) : undefined;
  const locked = Boolean(edge?.data?.locked);
  const on = branch === 'true';
  const unlink = () => {
    if (!edge) return;
    if (edge.data?.locked) {
      showToast('That connector is locked. Unlock it to reconnect.');
      return;
    }
    deleteEdge(edge.id);
  };

  return (
    <div className="cb-branch-block">
      <div className={cx('cb-branch-block__pill', on ? 'is-true' : 'is-false')}>
        {on ? <CircleCheck size={16} /> : <CircleX size={16} />}
        {on ? 'True' : 'False'}
      </div>
      {target && edge ? (
        <div className="cb-btn-card__node cb-branch-link">
          <button type="button" className="cb-btn-card__target" onClick={() => focusNode(target.id)} title="Show on canvas">
            <span className="cb-btn-card__tile">
              <MaskIcon src={nodeIcon} width={14} height={14} />
            </span>
            <b>{nodeLabel(target.data)}</b>
          </button>
          <span className="cb-btn-card__node-actions">
            <button
              type="button"
              className="cb-btn-card__icon"
              aria-label={locked ? 'Unlock connector' : 'Lock connector'}
              onClick={() => toggleEdgeLock(edge.id)}
            >
              <img src={locked ? lockClosedIcon : lockIcon} alt="" width={24} height={24} />
            </button>
            <button type="button" className="cb-btn-card__icon" aria-label="Disconnect node" onClick={unlink}>
              <img src={unlinkIcon} alt="" width={24} height={24} />
            </button>
          </span>
        </div>
      ) : (
        <Select
          aria-label={`Connect the ${branch} branch to a node`}
          placeholder="Connect to a node"
          value=""
          icon={<img src={shareNodeMutedIcon} alt="" width={24} height={24} />}
          options={nodes.filter((n) => n.id !== nodeId).map((n) => ({ value: n.id, label: nodeLabel(n.data) }))}
          onChange={(targetId) => connect({ source: nodeId, sourceHandle: handle, target: targetId, targetHandle: null })}
        />
      )}
    </div>
  );
}

function Scrim({ title, labelledBy, onClose, children, save }: { title: string; labelledBy: string; onClose: () => void; children: ReactNode; save?: boolean }) {
  const card = useRef<HTMLDivElement>(null);
  useDismiss(card, true, onClose);
  return (
    <div className="cb-scrim">
      <div ref={card} className={cx('cb-modal', save && 'cb-modal--save')} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="cb-modal__head">
          <h2 id={labelledBy} className="cb-modal__title">
            {title}
          </h2>
          {!save && <IconButton label="Close" icon={<X size={16} />} onClick={onClose} />}
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveDialog({ element, onClose, onSave }: { element: NodeElement; onClose: () => void; onSave: () => void }) {
  const titleId = useId();
  const spec = inputSpec(element.inputKind);
  const name = element.text?.trim() || 'Input';
  return (
    <Scrim title="Save input" labelledBy={titleId} onClose={onClose} save>
      <div className="cb-save__preview">
        <KindTile spec={spec} saved />
        <span className="t-body2">{name}</span>
      </div>
      <p className="cb-save__line">
        Variable type: <b>{spec.typeName}</b>
      </p>
      <p className="cb-save__line">
        Variable name: <b>{name}</b>
      </p>
      <div className="cb-modal__actions">
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </Scrim>
  );
}

function emptyRule(join: InputRule['join'] = 'and'): InputRule {
  return { id: uid('rule'), join, operator: '', value: '' };
}

function ConditionModal({
  element,
  onClose,
  onSave,
}: {
  element: NodeElement;
  onClose: () => void;
  onSave: (condition: InputCondition) => void;
}) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<InputCondition>(() =>
    element.condition
      ? { name: element.condition.name, rules: element.condition.rules.map((rule) => ({ ...rule })) }
      : { name: '', rules: [emptyRule()] },
  );
  const spec = inputSpec(element.inputKind);
  const label = element.text?.trim() || 'Input';

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const setRule = (id: string, patch: Partial<InputRule>) =>
    setDraft((d) => ({ ...d, rules: d.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)) }));

  return (
    <Scrim title="Condition" labelledBy={titleId} onClose={onClose}>
      <TextField
        ref={nameRef}
        fieldClassName="cb-cond__name-field"
        label="Condition name"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <Divider />
      <div className="cb-cond__heads">
        <span />
        <span className="cb-cond__heads-mid">
          <span>Input label</span>
          <span>Operator</span>
          <span>Value</span>
        </span>
        <span />
      </div>
      <div className="cb-cond__rules">
        {draft.rules.map((rule, index) => (
          <div key={rule.id} className="cb-rule">
            <span className="cb-rule__join">{index > 0 ? (rule.join === 'and' ? 'AND' : 'OR') : ''}</span>
            <div className="cb-rule__seg">
              <Select
                aria-label="Input label"
                value={element.id}
                options={[{ value: element.id, label }]}
                onChange={() => undefined}
              />
              <Select
                aria-label="Operator"
                placeholder="Operator"
                value={rule.operator}
                options={spec.operators.map((op) => ({ value: op, label: op }))}
                onChange={(operator) => setRule(rule.id, { operator })}
              />
              <TextField
                aria-label="Value"
                placeholder="Value"
                value={rule.value}
                trailing={spec.dated ? <Calendar size={16} className="cb-rule__cal" /> : undefined}
                onChange={(e) => setRule(rule.id, { value: e.target.value })}
              />
            </div>
            {index > 0 ? (
              <button type="button" className="cb-rule__trash" aria-label="Remove condition" onClick={() => setDraft((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== rule.id) }))}>
                <CircleX size={16} />
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
      <div className="cb-cond__adds">
        <button type="button" className="cb-cond__add" onClick={() => setDraft((d) => ({ ...d, rules: [...d.rules, emptyRule('and')] }))}>
          <span aria-hidden>+</span> And condition
        </button>
        <button type="button" className="cb-cond__add" onClick={() => setDraft((d) => ({ ...d, rules: [...d.rules, emptyRule('or')] }))}>
          <span aria-hidden>+</span> Or condition
        </button>
      </div>
      <div className="cb-modal__actions">
        <Button variant="outline" onClick={() => setDraft({ name: '', rules: [emptyRule()] })}>
          Clear all
        </Button>
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(draft)}>Add conditions</Button>
      </div>
    </Scrim>
  );
}

export function UserInputEditor({
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
  const [saveOpen, setSaveOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const spec = inputSpec(element.inputKind);
  const kind = element.inputKind ?? 'text';

  return (
    <>
      <InputTypeField
        kind={kind}
        onChange={(inputKind) => {
          record();
          patch({ inputKind });
        }}
      />
      <div className="cb-input-label-row">
        <KindTile spec={spec} />
        <TextField
          aria-label="Input label"
          placeholder="Enter input label"
          value={element.text ?? ''}
          onFocus={record}
          onChange={(e) => patch({ text: e.target.value })}
        />
      </div>
      <div className="cb-input-actions">
        <Button variant="link" icon={<GitBranch size={16} />} onClick={() => setConditionOpen(true)}>
          Condition
        </Button>
        {!element.source && (
          <Button variant="link" icon={<Download size={16} />} onClick={() => setSaveOpen(true)}>
            Save input
          </Button>
        )}
      </div>
      {element.source ? (
        <div className="ds-field">
          <div className="ds-field__label t-overline t-overline--heavy">Checks saved input</div>
          <div className="cb-saved-chip">
            <KindTile spec={spec} saved />
            <span>{element.source}</span>
          </div>
        </div>
      ) : (
        <TextArea
          label="Error message"
          placeholder="Type message"
          rows={7}
          value={element.errorMessage ?? ''}
          onFocus={record}
          onChange={(e) => patch({ errorMessage: e.target.value })}
        />
      )}
      {element.savedName && (
        <div className="ds-field">
          <div className="ds-field__label t-overline t-overline--heavy">Saved input</div>
          <div className="cb-saved-chip">
            <KindTile spec={spec} saved />
            <span>{element.savedName}</span>
          </div>
        </div>
      )}
      {element.condition && (
        <div className="cb-cond-card">
          <div className="cb-cond-card__head">
            <span>Condition:</span>
            <button type="button" className="cb-cond-card__name" onClick={() => setConditionOpen(true)}>
              {element.condition.name.trim() || 'Condition'}
            </button>
          </div>
          <BranchLink nodeId={nodeId} elementId={element.id} branch="true" />
          <BranchLink nodeId={nodeId} elementId={element.id} branch="false" />
        </div>
      )}
      {saveOpen && (
        <SaveDialog
          element={element}
          onClose={() => setSaveOpen(false)}
          onSave={() => {
            record();
            patch({ savedName: element.text?.trim() || 'Input' });
            setSaveOpen(false);
          }}
        />
      )}
      {conditionOpen && (
        <ConditionModal
          element={element}
          onClose={() => setConditionOpen(false)}
          onSave={(condition) => {
            record();
            patch({ condition });
            setConditionOpen(false);
          }}
        />
      )}
    </>
  );
}
