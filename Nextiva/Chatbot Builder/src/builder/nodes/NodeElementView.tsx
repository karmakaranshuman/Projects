import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BarChart3, CircleCheck, CirclePlay, CircleX, ExternalLink, Image, Mail, Plus, Settings, Trash2, Upload } from 'lucide-react';
import glyphIcon from '../../assets/buttons/glyph.svg';
import { Button, cx, ElementGlyph, ElementIcon, IconButton } from '../../design-system';
import { DataChartView } from '../DataChartView';
import { createButton, elementSpec } from '../elements';
import { MediaPreview, useMediaPicker } from '../MediaTiles';
import { RichTextArea } from '../RichTextArea';
import { elementHtml, htmlToText } from '../richText';
import { useBuilder } from '../store';
import type { NodeElement } from '../types';
import { buttonHandleId, inputBranchHandle } from '../types';

type Point = { x: number; y: number };

function InputBranch({ elementId, branch }: { elementId: string; branch: 'true' | 'false' }) {
  const on = branch === 'true';
  return (
    <span className={cx('cb-branch', on ? 'is-true' : 'is-false')}>
      {on ? <CircleCheck size={16} className="cb-branch__icon" /> : <CircleX size={16} className="cb-branch__icon" />}
      {on ? 'True' : 'False'}
      <Handle
        type="source"
        id={inputBranchHandle(elementId, branch)}
        position={Position.Right}
        className="cb-handle cb-branch__handle"
        title="Drag to connect"
      >
        <Plus size={10} strokeWidth={2.5} />
      </Handle>
    </span>
  );
}

/** Focus can miss while React Flow is still measuring the node, so keep trying for a few frames. */
function focusEditable(el: HTMLElement, at: Point | null) {
  let frame = 0;
  let tries = 0;
  const focus = () => {
    el.focus({ preventScroll: true });
    if (document.activeElement === el) placeCaret(el, at);
    else if (tries++ < 10) frame = requestAnimationFrame(focus);
  };
  focus();
  return () => cancelAnimationFrame(frame);
}

/** Moves the caret to the clicked spot, or to the end of the text. */
function placeCaret(el: HTMLElement, at: Point | null) {
  const sel = document.getSelection();
  if (!sel) return;
  let range: Range | null = null;
  if (at) {
    const pos = document.caretPositionFromPoint?.(at.x, at.y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
    } else {
      range = document.caretRangeFromPoint?.(at.x, at.y) ?? null;
    }
  }
  if (!range || !el.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

export function NodeElementView({
  nodeId,
  element,
  autoEdit,
  nodeSelected,
  onSettings,
}: {
  nodeId: string;
  element: NodeElement;
  autoEdit: boolean;
  nodeSelected: boolean;
  onSettings: () => void;
}) {
  const { updateElement, requestDeleteElement, record, edges, rightPanel } = useBuilder();
  const spec = elementSpec(element.type);
  const inPanel =
    rightPanel.kind === 'nodeDetails' && rightPanel.nodeId === nodeId && rightPanel.elementId === element.id && !rightPanel.buttonId;
  const [editing, setEditing] = useState(autoEdit && element.type === 'text');
  const [pickedButton, setPickedButton] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const buttonEditRef = useRef<HTMLSpanElement>(null);
  const inputEditRef = useRef<HTMLSpanElement>(null);
  const press = useRef<Point | null>(null);
  const caretAt = useRef<Point | null>(null);
  const picker = useMediaPicker((added) => {
    record();
    updateElement(nodeId, element.id, { media: [...(element.media ?? []), ...added] });
  });

  useEffect(() => {
    if (!nodeSelected) {
      setEditing(false);
      setPickedButton(null);
      setEditingLabel(false);
    }
  }, [nodeSelected]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!editing || !el) return;
    const at = caretAt.current;
    caretAt.current = null;
    return focusEditable(el, at);
  }, [editing]);

  useLayoutEffect(() => {
    const el = buttonEditRef.current;
    if (!pickedButton || !el || document.activeElement === el) return;
    const label = (element.buttons ?? []).find((b) => b.id === pickedButton)?.label ?? '';
    if (el.textContent !== label) el.textContent = label;
  }, [pickedButton, element.buttons]);

  useLayoutEffect(() => {
    const el = buttonEditRef.current;
    if (!pickedButton || !el) return;
    const at = caretAt.current;
    caretAt.current = null;
    return focusEditable(el, at);
  }, [pickedButton]);

  useLayoutEffect(() => {
    const el = inputEditRef.current;
    if (!editingLabel || !el || document.activeElement === el) return;
    const label = element.text ?? '';
    if (el.textContent !== label) el.textContent = label;
  }, [editingLabel, element.text]);

  useLayoutEffect(() => {
    const el = inputEditRef.current;
    if (!editingLabel || !el) return;
    const at = caretAt.current;
    caretAt.current = null;
    return focusEditable(el, at);
  }, [editingLabel]);

  /** A click edits in place; a press that turned into a node drag does not. */
  const startEditing = (e: MouseEvent) => {
    const p = press.current;
    if ((e.target as Element).closest('a')) e.preventDefault();
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) return;
    caretAt.current = { x: e.clientX, y: e.clientY };
    setEditing(true);
  };

  const body = (() => {
    switch (element.type) {
      case 'text':
        return (
          <RichTextArea
            ref={textRef}
            label="Message"
            html={elementHtml(element)}
            editable={editing}
            placeholder="Type your message"
            className={cx('cb-el-text', editing && 'nodrag nowheel nokey')}
            onFocus={record}
            onChange={(html) => updateElement(nodeId, element.id, { html, text: htmlToText(html) })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              e.currentTarget.blur();
              setEditing(false);
            }}
            onPointerDown={(e) => {
              press.current = { x: e.clientX, y: e.clientY };
            }}
            onClick={editing ? undefined : startEditing}
          />
        );
      case 'buttons': {
        const buttons = element.buttons ?? [];
        const connected = new Set(edges.filter((e) => e.source === nodeId).map((e) => e.sourceHandle));
        const addButton = () => {
          record();
          updateElement(nodeId, element.id, { buttons: [...buttons, createButton(buttons.length)] });
        };
        return (
          <div className="cb-el-buttons">
            {buttons.map((b) => {
              const handle = buttonHandleId(b.id);
              const picked = pickedButton === b.id;
              const setLabel = (label: string) =>
                updateElement(nodeId, element.id, { buttons: buttons.map((x) => (x.id === b.id ? { ...x, label } : x)) });
              return (
                <span
                  key={b.id}
                  className={cx('cb-btn', b.kind !== 'node' && 'is-link', picked && 'is-selected')}
                  onPointerDown={(e) => {
                    press.current = { x: e.clientX, y: e.clientY };
                  }}
                  onClick={(e) => {
                    if ((e.target as Element).closest('.cb-btn__handle')) return;
                    const p = press.current;
                    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) return;
                    if (picked) return;
                    caretAt.current = { x: e.clientX, y: e.clientY };
                    setPickedButton(b.id);
                  }}
                >
                  {b.look === 'media' && <CirclePlay size={12} aria-hidden />}
                  {b.look === 'icon' && <img className="cb-btn__glyph" src={glyphIcon} alt="" width={14} height={12} />}
                  {picked ? (
                    <span
                      ref={buttonEditRef}
                      role="textbox"
                      aria-label="Button label"
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      className={cx('cb-btn__edit nodrag nowheel nokey', !b.label && 'is-empty')}
                      onFocus={record}
                      onInput={(e) => setLabel((e.currentTarget.textContent ?? '').replace(/\n/g, ''))}
                      onBlur={() => setPickedButton(null)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== 'Escape') return;
                        e.preventDefault();
                        e.currentTarget.blur();
                        setPickedButton(null);
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' '));
                      }}
                    />
                  ) : (
                    <span className={cx('cb-btn__label nodrag', !b.label && 'is-empty')}>{b.label}</span>
                  )}
                  {b.kind === 'link' && <ExternalLink size={10} strokeWidth={2.5} />}
                  {b.kind === 'email' && <Mail size={10} strokeWidth={2.5} />}
                  {b.kind === 'node' && (
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={handle}
                      className={cx('cb-handle cb-btn__handle', connected.has(handle) && 'is-connected', picked && !connected.has(handle) && 'is-hidden')}
                      title={`Drag to connect “${b.label}”`}
                    >
                      <Plus size={10} strokeWidth={2.5} />
                    </Handle>
                  )}
                </span>
              );
            })}
            <div className="cb-el-buttons__add">
              <IconButton className="nodrag" label="Add button" size={24} icon={<Plus size={14} />} onClick={addButton} />
            </div>
          </div>
        );
      }
      case 'media': {
        const items = element.media ?? [];
        return (
          <div className={cx('cb-media', !items.length && 'is-empty', picker.over && 'is-drop')} {...picker.dropProps}>
            {items.length ? (
              <MediaPreview items={items} />
            ) : (
              <span className="cb-media__empty t-caption">
                <Image size={20} />
                Add images or videos
              </span>
            )}
            <Button variant="outline" className="cb-media__upload nodrag" icon={<Upload size={14} />} onClick={picker.open}>
              Upload
            </Button>
            {picker.input}
          </div>
        );
      }
      case 'carousel':
        return (
          <div className="cb-carousel">
            <span className="cb-input__chip">{element.slideDirection === 'vertical' ? 'Vertical carousel' : 'Horizontal carousel'}</span>
          </div>
        );
      case 'embed':
        return (
          <div className="cb-el-center">
            <span className="cb-el-pill is-logic" title={spec.nodeTooltip}>
              <ElementGlyph name={spec.nodeIcon} scale={0.75} />
              <span className="cb-el-pill__label">{element.text?.trim() || spec.nodeLabel}</span>
            </span>
          </div>
        );
      case 'transfer':
        return (
          <div className="cb-el-center">
            <span className="cb-el-pill is-logic" title={spec.nodeTooltip}>
              <ElementGlyph name={spec.nodeIcon} scale={0.75} />
              <span className="cb-el-pill__label">{element.text?.trim() || spec.nodeLabel}</span>
            </span>
          </div>
        );
      case 'dataDisplay':
        return element.chart ? (
          <div className="cb-el-chart">
            <DataChartView chart={element.chart} />
          </div>
        ) : (
          <div className="cb-el-media">
            <BarChart3 size={22} />
            <span className="t-caption">Chart or table</span>
          </div>
        );
      case 'feedback': {
        const condition = element.condition;
        return (
          <div className={cx('cb-feedback', condition && 'has-condition')}>
            <span className="cb-input__chip">User feedback</span>
            {condition && (
              <div className="cb-feedback__condition">
                <span className="cb-input__chip">{condition.name.trim() || 'Condition'}</span>
                <div className="cb-input__branches">
                  <InputBranch elementId={element.id} branch="true" />
                  <InputBranch elementId={element.id} branch="false" />
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'userInput': {
        const label = element.text ?? '';
        const trimmed = label.trim();
        const condition = element.condition;
        const setLabel = (text: string) => updateElement(nodeId, element.id, { text });
        const editLabel = (e: MouseEvent) => {
          if ((e.target as Element).closest('.cb-branch__handle')) return;
          const p = press.current;
          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) return;
          if (editingLabel) return;
          caretAt.current = { x: e.clientX, y: e.clientY };
          setEditingLabel(true);
        };
        return (
          <div className={cx('cb-input', condition && 'has-condition')}>
            {condition ? (
              <span className="cb-input__chip">{condition.name.trim() || 'Condition'}</span>
            ) : (
              <span
                className={cx('cb-input__label', trimmed ? 'cb-input__chip' : 'cb-input__empty', editingLabel && trimmed && 'is-editing')}
                onPointerDown={(e) => {
                  press.current = { x: e.clientX, y: e.clientY };
                }}
                onClick={editLabel}
              >
                {editingLabel ? (
                  <span
                    ref={inputEditRef}
                    role="textbox"
                    aria-label="Input label"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    className={cx('cb-input__edit nodrag nowheel nokey', !trimmed && 'is-empty')}
                    onFocus={record}
                    onInput={(e) => setLabel((e.currentTarget.textContent ?? '').replace(/\n/g, ''))}
                    onBlur={() => setEditingLabel(false)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== 'Escape') return;
                      e.preventDefault();
                      e.currentTarget.blur();
                      setEditingLabel(false);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' '));
                    }}
                  />
                ) : (
                  trimmed || 'Input'
                )}
              </span>
            )}
            {condition && (
              <div className="cb-input__branches">
                <InputBranch elementId={element.id} branch="true" />
                <InputBranch elementId={element.id} branch="false" />
              </div>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="cb-el-center">
            <span
              className={cx('cb-el-pill', spec.family === 'logic' ? 'is-logic' : 'is-input')}
              title={spec.nodeTooltip}
            >
              <ElementGlyph name={spec.nodeIcon} scale={0.75} />
              {spec.nodeLabel}
            </span>
          </div>
        );
    }
  })();

  return (
    <div className={cx('cb-el', `cb-el--${element.type}`, editing && 'is-editing', inPanel && 'is-selected')}>
      {body}
      {!editing && !inPanel && (
        <div className="cb-el__menu nodrag" role="toolbar" aria-label={`${spec.label} element actions`}>
          <ElementIcon icon={spec.nodeIcon} family={spec.family} size="mini" />
          <div className="cb-el__actions">
            {spec.edit !== 'inline' && (
              <IconButton label={`${spec.label} settings`} size={24} icon={<Settings size={14} />} onClick={onSettings} />
            )}
            <IconButton
              label={`Delete ${spec.label}`}
              size={24}
              variant="danger"
              icon={<Trash2 size={14} />}
              onClick={() => requestDeleteElement(nodeId, element.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
