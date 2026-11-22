import { useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button, TextField, cx } from '../../design-system';
import { elementSpec } from '../elements';
import { inputSpec, type InputTypeSpec } from '../inputs';
import type { InputKind, NodeElement } from '../types';
import { useDismiss } from '../useDismiss';

const SAVE_KIND: Partial<Record<NodeElement['type'], InputKind>> = {
  dropdown: 'dropdown',
  calendar: 'date',
  email: 'email',
  phone: 'phone',
};

/** Palette elements that can be saved the same way as a user input. */
export function isCollectInput(type: NodeElement['type']): boolean {
  return type === 'dropdown' || type === 'calendar' || type === 'email' || type === 'phone';
}

export function CollectEditor({
  element,
  patch,
  record,
}: {
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const spec = inputSpec(SAVE_KIND[element.type] ?? 'text');
  const name = elementSpec(element.type).label;
  const options = element.options?.length ? element.options : [''];

  return (
    <>
      {element.type === 'dropdown' && (
        <div className="cb-option-list">
          {options.map((option, index) => (
            <div key={index} className="cb-option-row">
              <TextField
                aria-label={`Option ${index + 1}`}
                placeholder={`Option ${index + 1}`}
                value={option}
                onFocus={record}
                onChange={(e) => patch({ options: options.map((item, i) => (i === index ? e.target.value : item)) })}
              />
              {options.length > 1 && (
                <button
                  type="button"
                  className="cb-option-row__remove"
                  aria-label={`Remove option ${index + 1}`}
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
      )}
      {element.type !== 'dropdown' && (
        <TextField
          label="Input placeholder"
          value={element.text ?? ''}
          onFocus={record}
          onChange={(e) => patch({ text: e.target.value })}
        />
      )}
      <div className={cx('cb-input-actions', element.type !== 'dropdown' && 'is-end')}>
        {element.type === 'dropdown' && (
          <Button
            variant="link"
            icon={<Plus size={16} />}
            onClick={() => {
              record();
              patch({ options: [...options, `Option ${options.length + 1}`] });
            }}
          >
            Add option
          </Button>
        )}
        <Button variant="link" icon={<Download size={16} />} onClick={() => setSaveOpen(true)}>
          Save input
        </Button>
      </div>
      {element.savedName && (
        <div className="ds-field">
          <div className="ds-field__label t-overline t-overline--heavy">Saved input</div>
          <div className="cb-saved-chip">
            <KindTile spec={spec} saved />
            <span>{element.savedName}</span>
          </div>
        </div>
      )}
      {saveOpen && (
        <SaveDialog
          spec={spec}
          name={name}
          onClose={() => setSaveOpen(false)}
          onSave={() => {
            record();
            patch({ savedName: name });
            setSaveOpen(false);
          }}
        />
      )}
    </>
  );
}

function KindTile({ spec, saved }: { spec: InputTypeSpec; saved?: boolean }) {
  const style: CSSProperties = {
    width: spec.w,
    height: spec.h,
    WebkitMaskImage: `url("${spec.icon}")`,
    maskImage: `url("${spec.icon}")`,
  };
  return (
    <span className={cx('cb-input-tile', saved && 'is-saved')}>
      <span className="cb-input-tile__mask" style={style} />
    </span>
  );
}

function SaveDialog({ spec, name, onClose, onSave }: { spec: InputTypeSpec; name: string; onClose: () => void; onSave: () => void }) {
  const titleId = useId();
  return (
    <Scrim title="Save input" labelledBy={titleId} onClose={onClose}>
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

function Scrim({ title, labelledBy, onClose, children }: { title: string; labelledBy: string; onClose: () => void; children: ReactNode }) {
  const card = useRef<HTMLDivElement>(null);
  useDismiss(card, true, onClose);
  return (
    <div className="cb-scrim">
      <div ref={card} className="cb-modal cb-modal--save" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="cb-modal__head">
          <h2 id={labelledBy} className="cb-modal__title">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
