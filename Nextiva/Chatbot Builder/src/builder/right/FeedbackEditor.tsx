import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Angry, Download, Frown, GitBranch, Hash, Laugh, List, Meh, Plus, Smile, Star, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { Button, cx, Divider, IconButton, Select, TextField } from '../../design-system';
import {
  EMOJI_RATINGS,
  FEEDBACK_NAME,
  ratingChoices,
  ratingMeasure,
  ratingOperators,
  ratingScaleOf,
  ratingStyleOf,
  ratingTypeName,
  RATING_SYSTEMS,
} from '../feedback';
import type { InputCondition, InputRule, NodeElement, RatingStyle } from '../types';
import { uid } from '../uid';
import { useDismiss } from '../useDismiss';
import { BranchLink } from './UserInputEditor';

const EMOJI_ICONS = [Laugh, Smile, Meh, Frown, Angry];

function RatingMark({ style }: { style: RatingStyle }) {
  const Icon = style === 'emoji' ? Smile : style === 'like' ? ThumbsUp : style === 'number' ? Hash : style === 'custom' ? List : Star;
  return (
    <span className="cb-input-tile is-saved">
      <Icon size={14} />
    </span>
  );
}

function Choice({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={cx('cb-choice', selected && 'is-selected')} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

function Scrim({
  title,
  labelledBy,
  onClose,
  children,
  save,
}: {
  title: string;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  save?: boolean;
}) {
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

function SaveDialog({ style, onClose, onSave }: { style: RatingStyle; onClose: () => void; onSave: () => void }) {
  const titleId = useId();
  return (
    <Scrim title="Save input" labelledBy={titleId} onClose={onClose} save>
      <div className="cb-save__preview">
        <RatingMark style={style} />
        <span className="t-body2">{FEEDBACK_NAME}</span>
      </div>
      <p className="cb-save__line">
        Variable type: <b>{ratingTypeName(style)}</b>
      </p>
      <p className="cb-save__line">
        Variable name: <b>{FEEDBACK_NAME}</b>
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

function emptyRule(): InputRule {
  return { id: uid('rule'), join: 'and', operator: '', value: '' };
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
  const style = ratingStyleOf(element);
  const [draft, setDraft] = useState<InputCondition>(() =>
    element.condition
      ? { name: element.condition.name, rules: element.condition.rules.map((rule) => ({ ...rule })) }
      : { name: '', rules: [emptyRule()] },
  );
  const rule = draft.rules[0] ?? emptyRule();

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const setRule = (patch: Partial<InputRule>) => setDraft((d) => ({ ...d, rules: [{ ...rule, ...patch }] }));

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
      <div className="cb-feedback-cond__heads">
        <span>User feedback</span>
        <span>Operator</span>
        <span>Value</span>
      </div>
      <div className="cb-rule__seg">
        <div className="cb-rule__fixed">{ratingMeasure(style)}</div>
        <Select
          aria-label="Operator"
          placeholder="Operator"
          value={rule.operator}
          options={ratingOperators(style).map((op) => ({ value: op, label: op }))}
          onChange={(operator) => setRule({ operator })}
        />
        <Select
          aria-label="Value"
          placeholder="Value"
          value={rule.value}
          options={ratingChoices(element).map((choice) => ({ value: choice.id, label: choice.label }))}
          onChange={(value) => setRule({ value })}
        />
      </div>
      <div className="cb-modal__actions is-split">
        <Button variant="outline" onClick={() => setDraft({ name: '', rules: [emptyRule()] })}>
          Clear all
        </Button>
        <span className="cb-modal__actions-end">
          <Button variant="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ name: draft.name, rules: [rule] })}>Add conditions</Button>
        </span>
      </div>
    </Scrim>
  );
}

export function FeedbackEditor({
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
  const style = ratingStyleOf(element);
  const scale = ratingScaleOf(element);
  const options = element.options?.length ? element.options : ['Rating 1', 'Rating 2'];

  const pickStyle = (ratingStyle: RatingStyle) => {
    record();
    patch(ratingStyle === 'custom' && !element.options?.length ? { ratingStyle, options: ['Rating 1', 'Rating 2'] } : { ratingStyle });
  };

  return (
    <div className="cb-rate">
      {element.savedName && (
        <div className="cb-rate__block">
          <span className="t-body2 t-secondary">Saved input</span>
          <span className="cb-saved-chip is-boxed">
            <RatingMark style={style} />
            <span>{element.savedName}</span>
          </span>
        </div>
      )}

      <div className="cb-rate__block">
        <span className="cb-rate__label">Select rating system:</span>
        <div className="cb-choices">
          {RATING_SYSTEMS.map((item) => (
            <Choice key={item.id} selected={style === item.id} onClick={() => pickStyle(item.id)}>
              {item.label}
            </Choice>
          ))}
        </div>
      </div>

      <div className="cb-rate__block">
        {(style === 'star' || style === 'number') && (
          <>
            <span className="cb-rate__label">Select scale:</span>
            <div className="cb-choices">
              <Choice
                selected={scale === 5}
                onClick={() => {
                  record();
                  patch({ ratingScale: 5 });
                }}
              >
                {style === 'star' ? '5 Stars' : 'Scale of 5'}
              </Choice>
              <Choice
                selected={scale === 10}
                onClick={() => {
                  record();
                  patch({ ratingScale: 10 });
                }}
              >
                {style === 'star' ? '10 stars' : 'Scale of 10'}
              </Choice>
            </div>
          </>
        )}
        {style === 'emoji' && (
          <div className="cb-rate__faces" aria-hidden>
            {EMOJI_ICONS.map((Icon, i) => (
              <span key={EMOJI_RATINGS[i].id} className={cx('cb-rate__face', `is-${EMOJI_RATINGS[i].tone}`)}>
                <Icon size={16} />
              </span>
            ))}
          </div>
        )}
        {style === 'like' && (
          <div className="cb-rate__thumbs" aria-hidden>
            <span className="cb-rate__thumb">
              <ThumbsUp size={16} />
            </span>
            <span className="cb-rate__thumb">
              <ThumbsDown size={16} />
            </span>
          </div>
        )}
        {style === 'custom' && (
          <div className="cb-rate-custom">
            <div className="cb-rate-custom__rows">
              {options.map((option, index) => (
                <div key={index} className="cb-rate-custom__row">
                  <TextField
                    aria-label={`Rating ${index + 1}`}
                    value={option}
                    onFocus={record}
                    onChange={(e) => patch({ options: options.map((item, i) => (i === index ? e.target.value : item)) })}
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      className="cb-rate-custom__trash"
                      aria-label={`Remove rating ${index + 1}`}
                      onClick={() => {
                        record();
                        patch({ options: options.filter((_, i) => i !== index) });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="cb-rate-custom__add"
              aria-label="Add rating"
              onClick={() => {
                record();
                patch({ options: [...options, `Rating ${options.length + 1}`] });
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="cb-input-actions">
        <Button variant="link" icon={<GitBranch size={16} />} onClick={() => setConditionOpen(true)}>
          Condition
        </Button>
        <Button variant="link" icon={<Download size={16} />} onClick={() => setSaveOpen(true)}>
          Save input
        </Button>
      </div>

      {element.condition && (
        <div className="cb-cond-card is-boxed">
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
          style={style}
          onClose={() => setSaveOpen(false)}
          onSave={() => {
            record();
            patch({ savedName: FEEDBACK_NAME });
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
    </div>
  );
}
