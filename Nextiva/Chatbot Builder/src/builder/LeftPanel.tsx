import { Fragment, useMemo, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { Button, Divider, ElementChip, ElementGlyph, IconButton, SearchField, Tooltip, type ElementGlyphName } from '../design-system';
import { ELEMENTS, FAMILY_SECTIONS, elementSpec, type ElementSpec } from './elements';
import { inputSpec, type InputTypeSpec } from './inputs';
import type { InputKind, NodeElement } from './types';
import { useBuilder } from './store';
import { BottomToolbar } from './BottomToolbar';
import { usePaletteDrag } from './usePaletteDrag';

export function LeftPanel() {
  const { leftPanel, setLeftPanel, dragElement, nodes } = useBuilder();
  const { onPointerDown, onKeyDown, ghost } = usePaletteDrag();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ELEMENTS.filter((el) => {
      if (q) return el.label.toLowerCase().includes(q) || el.tooltip.toLowerCase().includes(q);
      return leftPanel.advanced || el.tier === 'simple';
    });
  }, [query, leftPanel.advanced]);

  const savedVariables = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const saved: SavedVariable[] = [];
    for (const node of nodes) {
      for (const el of node.data.elements) {
        const name = el.savedName?.trim();
        if (!name || seen.has(name)) continue;
        const kind = savedKind(el);
        if (!kind) continue;
        if (q && !name.toLowerCase().includes(q) && !kind.type.toLowerCase().includes(q)) continue;
        seen.add(name);
        saved.push({ name, ...kind });
      }
    }
    return saved;
  }, [nodes, query]);

  const savedChips = savedVariables.map((v) => <SavedChip key={v.name} variable={v} />);

  const dragProps = (el: ElementSpec) => ({
    draggable: true,
    state: dragElement === el.type ? ('selected' as const) : ('default' as const),
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => onPointerDown(e, el.type),
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => onKeyDown(e, el.type),
  });

  const toggleTier = (
    <Button
      size="sm"
      variant="secondary"
      className="cb-left__tier"
      onClick={() => setLeftPanel({ ...leftPanel, advanced: !leftPanel.advanced })}
    >
      {leftPanel.advanced ? 'Show less elements' : 'Show more elements'}
    </Button>
  );

  if (!leftPanel.expanded) {
    return (
      <aside className="cb-left cb-left--min" aria-label="Builder elements">
        <div className="cb-left__minrow">
          <IconButton
            label="Expand elements panel"
            size={24}
            variant="bordered"
            icon={<ArrowUpDown size={14} />}
            onClick={() => setLeftPanel({ ...leftPanel, expanded: true })}
          />
          <div
            className="cb-left__minbar"
            onWheel={(e) => {
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
            }}
          >
            {FAMILY_SECTIONS.map((section, i) => {
              const items = visible.filter((el) => el.family === section.family);
              if (!items.length) return null;
              return (
                <Fragment key={section.family}>
                  {i > 0 && <Divider vertical />}
                  <div className="cb-left__mini-group">
                    {items.map((el) => (
                      <ElementChip
                        key={el.type}
                        icon={el.icon}
                        family={el.family}
                        label={el.label}
                        tooltip={el.label}
                        size="mini"
                        {...dragProps(el)}
                      />
                    ))}
                  </div>
                </Fragment>
              );
            })}
            {savedChips.length > 0 && (
              <>
                <Divider vertical />
                <div className="cb-left__mini-group">{savedChips}</div>
              </>
            )}
          </div>
          {toggleTier}
        </div>
        <div className="cb-left__spacer" />
        <BottomToolbar />
        {ghost}
      </aside>
    );
  }

  return (
    <aside className="cb-left" aria-label="Builder elements">
      <div className="cb-left__controls">
        <IconButton
          label="Collapse elements panel"
          size={24}
          variant="bordered"
          icon={<ArrowLeftRight size={14} />}
          onClick={() => setLeftPanel({ ...leftPanel, expanded: false })}
        />
      </div>
      <div className="cb-left__panel">
        <h2 className="t-body1-heavy cb-left__title">Builder elements</h2>
        <SearchField value={query} onChange={setQuery} />
        <div className="cb-left__list">
          <p className="t-caption t-secondary cb-left__hint">Drag and drop elements into your workspace</p>
          {FAMILY_SECTIONS.map((section) => {
            const items = visible.filter((el) => el.family === section.family);
            if (!items.length) return null;
            return (
              <section key={section.family} className="cb-left__section">
                <h3 className="t-overline cb-left__section-title">
                  {section.lead}
                  <b>{section.emphasis}</b>
                  {section.tail}
                </h3>
                <div className="cb-left__chips">
                  {items.map((el) => (
                    <ElementChip
                      key={el.type}
                      icon={el.icon}
                      family={el.family}
                      label={el.label}
                      tooltip={el.tooltip}
                      {...dragProps(el)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {savedVariables.length > 0 && (
            <section className="cb-left__section">
              <h3 className="t-overline t-overline--heavy cb-left__section-title">Saved variables</h3>
              <div className="cb-left__saved">{savedChips}</div>
            </section>
          )}
          {!visible.length && !savedVariables.length && <p className="t-caption t-secondary">No elements match “{query}”.</p>}
        </div>
        {toggleTier}
      </div>
      <BottomToolbar />
      {ghost}
    </aside>
  );
}

const COLLECT_KIND: Partial<Record<NodeElement['type'], InputKind>> = {
  userInput: 'text',
  dropdown: 'dropdown',
  calendar: 'date',
  email: 'email',
  phone: 'phone',
};

/** Figma draws the glyph at 8.75/12.25 of its node size inside the 20px icon frame. */
const SAVED_GLYPH_SCALE = 0.714;

interface SavedVariable {
  name: string;
  /** Element or input type shown in the hover tooltip. */
  type: string;
  icon: InputTypeSpec | ElementGlyphName;
}

function savedKind(el: NodeElement): Omit<SavedVariable, 'name'> | null {
  if (el.type === 'feedback') {
    const spec = elementSpec('feedback');
    return { type: spec.nodeLabel, icon: spec.nodeIcon };
  }
  const fallback = COLLECT_KIND[el.type];
  if (!fallback) return null;
  const spec = inputSpec(el.type === 'userInput' ? (el.inputKind ?? fallback) : fallback);
  // The city asset ships with its own tile background, so it can't be tinted with a mask.
  return { type: spec.typeName, icon: spec.kind === 'city' ? 'userInput' : spec };
}

function SavedChip({ variable }: { variable: SavedVariable }) {
  const { icon } = variable;
  return (
    <Tooltip content={`${variable.name} · ${variable.type}`}>
      <span className="cb-saved-var" tabIndex={0} aria-label={`Saved ${variable.type.toLowerCase()} input: ${variable.name}`}>
        <span className="cb-saved-var__icon" aria-hidden>
          {typeof icon === 'string' ? (
            <ElementGlyph name={icon} scale={SAVED_GLYPH_SCALE} />
          ) : (
            <span
              className="cb-saved-var__mask"
              style={{
                width: icon.w * SAVED_GLYPH_SCALE,
                height: icon.h * SAVED_GLYPH_SCALE,
                WebkitMaskImage: `url("${icon.icon}")`,
                maskImage: `url("${icon.icon}")`,
              }}
            />
          )}
        </span>
        <span className="cb-saved-var__name">{variable.name}</span>
      </span>
    </Tooltip>
  );
}
