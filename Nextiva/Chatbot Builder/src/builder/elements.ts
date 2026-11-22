import type { ElementGlyphName } from '../design-system';
import type { ButtonItem, ButtonLook, CarouselSlide, ElementFamily, ElementType, NodeElement } from './types';
import { uid } from './uid';

/** Mirrors the ".Chatbot chips V2" component set: label, glyph and hover tooltip per element. */
export interface ElementSpec {
  type: ElementType;
  label: string;
  /** What the element is used for; shown when hovering the chip. */
  tooltip: string;
  family: ElementFamily;
  icon: ElementGlyphName;
  /** Simple elements are shown by default; advanced ones appear after "Show more elements". */
  tier: 'simple' | 'advanced';
  /** Name once placed in a node (User input becomes "Text input", User feedback becomes "Rating"). */
  nodeLabel: string;
  nodeIcon: ElementGlyphName;
  nodeTooltip: string;
  /** Where the element is edited: directly inside the node, in the right panel, or both. */
  edit: 'inline' | 'panel' | 'both';
}

type SpecInput = Omit<ElementSpec, 'nodeLabel' | 'nodeIcon' | 'nodeTooltip' | 'edit'> & Partial<ElementSpec>;
const spec = (s: SpecInput): ElementSpec => ({
  nodeLabel: s.label,
  nodeIcon: s.icon,
  nodeTooltip: s.tooltip,
  edit: 'panel',
  ...s,
});

export const ELEMENTS: ElementSpec[] = [
  spec({ type: 'text', label: 'Text', tooltip: 'Text, link, emoji', family: 'output', icon: 'text', tier: 'simple', edit: 'both' }),
  spec({ type: 'media', label: 'Media', tooltip: 'Image, video, documents', family: 'output', icon: 'media', tier: 'simple', edit: 'both' }),
  spec({ type: 'dataDisplay', label: 'Data display', tooltip: 'Charts, graphs, tables', family: 'output', icon: 'display', tier: 'advanced' }),
  spec({ type: 'buttons', label: 'Buttons', tooltip: 'Text, image and icon buttons', family: 'input', icon: 'buttons', tier: 'simple' }),
  spec({
    type: 'userInput',
    label: 'User input',
    tooltip: 'Random or validated input',
    family: 'input',
    icon: 'userInput',
    tier: 'simple',
    nodeLabel: 'Text input',
    nodeIcon: 'textInput',
    nodeTooltip: 'Unvalidated input',
  }),
  spec({
    type: 'feedback',
    label: 'User feedback',
    tooltip: 'Rating systems with scales',
    family: 'input',
    icon: 'feedback',
    tier: 'simple',
    nodeLabel: 'Rating',
    nodeIcon: 'rating',
    nodeTooltip: '5 star rating system',
  }),
  spec({ type: 'carousel', label: 'Carousel', tooltip: 'Vertical and horizontal slides', family: 'input', icon: 'carousel', tier: 'advanced' }),
  spec({ type: 'dropdown', label: 'Dropdown', tooltip: 'Fixed input', family: 'input', icon: 'dropdown', tier: 'advanced' }),
  spec({ type: 'calendar', label: 'Calendar', tooltip: 'Date picker', family: 'input', icon: 'calendar', tier: 'advanced' }),
  spec({ type: 'email', label: 'Email address', tooltip: 'Email validation', family: 'input', icon: 'email', tier: 'advanced' }),
  spec({ type: 'phone', label: 'Phone number', tooltip: 'Phone number validation', family: 'input', icon: 'phone', tier: 'advanced' }),
  spec({
    type: 'transfer',
    label: 'Transfer',
    tooltip: 'Transfer communication from chatbot',
    family: 'logic',
    icon: 'transfer',
    tier: 'advanced',
    nodeLabel: 'Transfer to agent',
  }),
  spec({ type: 'embed', label: 'Embed', tooltip: 'Custom script', family: 'logic', icon: 'embed', tier: 'advanced', nodeLabel: 'Custom script' }),
  spec({
    type: 'api',
    label: 'API',
    tooltip: 'External application interface',
    family: 'logic',
    icon: 'api',
    tier: 'advanced',
    nodeLabel: 'API call',
  }),
];

const byType = new Map(ELEMENTS.map((e) => [e.type, e]));

export function elementSpec(type: ElementType): ElementSpec {
  return byType.get(type)!;
}

/** Text, media, and buttons are edited on the node. Every other element opens in the right panel. */
export function opensPanelOnAdd(type: ElementType): boolean {
  return type !== 'text' && type !== 'media' && type !== 'buttons';
}

export const FAMILY_SECTIONS: Array<{ family: ElementFamily; lead: string; emphasis: string; tail: string }> = [
  { family: 'output', lead: 'Show ', emphasis: 'output', tail: ' from bot' },
  { family: 'input', lead: 'Take ', emphasis: 'input', tail: ' from customer' },
  { family: 'logic', lead: 'Build ', emphasis: 'logic', tail: '' },
];

export function createElement(type: ElementType): NodeElement {
  const base: NodeElement = { id: uid('el'), type };
  switch (type) {
    case 'text':
      return { ...base, text: '' };
    case 'buttons':
      return { ...base, buttons: [createButton(0), createButton(1)] };
    case 'feedback':
      return { ...base, ratingStyle: 'star', text: 'How was your experience?' };
    case 'dropdown':
      return { ...base, options: ['Option 1', 'Option 2', 'Option 3'] };
    case 'userInput':
      return { ...base, text: '', inputKind: 'text' };
    case 'email':
      return { ...base, text: 'Enter your email' };
    case 'phone':
      return { ...base, text: 'Enter your phone number' };
    case 'calendar':
      return { ...base, text: 'Pick a date' };
    case 'media':
      return { ...base, media: [] };
    case 'carousel':
      return { ...base, slideDirection: 'horizontal', slides: [createSlide()] };
    case 'embed':
      return { ...base, text: '', script: '' };
    case 'transfer':
      return { ...base, text: 'Support team' };
    default:
      return base;
  }
}

/** Static nodes hold any number of output and logic elements; adding a customer input makes the node interactive. */
export function isStaticNode(elements: NodeElement[]): boolean {
  return !elements.some((el) => elementSpec(el.type).family === 'input');
}

/** A node can wait for at most one customer input. */
export function canAddElement(existing: NodeElement[], type: ElementType): boolean {
  return elementSpec(type).family !== 'input' || isStaticNode(existing);
}

/** A new carousel card, empty until the author adds media, copy, and a link. */
export function createSlide(): CarouselSlide {
  return { id: uid('slide'), text: '', html: '', buttonLabel: '', buttonUrl: '' };
}

/** A new button. Text buttons that go to a node are the default. */
export function createButton(count: number, look: ButtonLook = 'text'): ButtonItem {
  return { id: uid('btn'), label: `Button ${count + 1}`, kind: 'node', look };
}

const isInput = (el: NodeElement) => elementSpec(el.type).family === 'input';

/**
 * Outputs and logic stay above the single input. Dropping either kind lands in that order,
 * so the input always finishes at the bottom of the node.
 */
export function placeElement(existing: NodeElement[], element: NodeElement): NodeElement[] {
  const all = [...existing, element];
  return [...all.filter((el) => !isInput(el)), ...all.filter(isInput)];
}
