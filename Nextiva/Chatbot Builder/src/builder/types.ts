import type { Edge, Node } from '@xyflow/react';

export type ElementType =
  | 'text'
  | 'media'
  | 'dataDisplay'
  | 'buttons'
  | 'userInput'
  | 'feedback'
  | 'carousel'
  | 'dropdown'
  | 'calendar'
  | 'email'
  | 'phone'
  | 'transfer'
  | 'embed'
  | 'api';

/** Output = bot says something, Input = waits for the customer, Logic = hands off / runs something. */
export type ElementFamily = 'output' | 'input' | 'logic';

export type ButtonKind = 'node' | 'link' | 'email';
export type RatingStyle = 'star' | 'emoji' | 'number' | 'like' | 'custom';
/** How the button is drawn: words, a media mark, or an icon. */
export type ButtonLook = 'text' | 'media' | 'icon';

export interface ButtonItem {
  id: string;
  label: string;
  kind: ButtonKind;
  /** Defaults to a text button. */
  look?: ButtonLook;
  /** Website URL for `link`, address for `email`. */
  url?: string;
  /** Picture shown for a media button in the right panel. */
  image?: string;
  /** Element prompt: what a customer can type instead of tapping this button. */
  prompt?: string;
}

export interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  /** The image itself, or a video's poster frame. */
  src: string;
  /** Playable file, for uploaded videos. */
  videoSrc?: string;
  name: string;
  /** Video length, e.g. "2:40". */
  duration?: string;
}

export type SlideDirection = 'horizontal' | 'vertical';

/** Line chart drawn by a Data display element. */
export interface DataChart {
  title: string;
  unit: string;
  /** Points in order along the x axis. Only points with `tick` get an axis label. */
  points: { label: string; value: number; tick?: boolean }[];
  /** Dashed reference line, e.g. a recommended level. */
  target?: { label: string; value: number };
}

/** One card in a carousel: a picture, a message, and a link button. */
export interface CarouselSlide {
  id: string;
  html?: string;
  text?: string;
  media?: MediaItem;
  buttonLabel?: string;
  buttonUrl?: string;
}

export interface NodeElement {
  id: string;
  type: ElementType;
  /** Plain text; for Text elements it mirrors `html` so search and AI matching need no markup. */
  text?: string;
  /** Formatted Text element content (bold, italic, underline, colour, links on any range). */
  html?: string;
  /** Media element gallery, in the order the bot sends it. */
  media?: MediaItem[];
  buttons?: ButtonItem[];
  /** User feedback: star, emoji, like/dislike, numeric, or custom labels. */
  ratingStyle?: RatingStyle;
  /** 5 or 10, for star and numeric feedback. */
  ratingScale?: 5 | 10;
  options?: string[];
  /** User input: which kind of answer this waits for. */
  inputKind?: InputKind;
  /** Message shown when the answer fails validation. */
  errorMessage?: string;
  /** Name kept when this input is saved for reuse. */
  savedName?: string;
  /** Saved input this condition checks instead of asking the customer again. */
  source?: string;
  /** True and false branches, drawn on the node once a condition is added. */
  condition?: InputCondition;
  /** Carousel: slides stack horizontally or vertically. */
  slideDirection?: SlideDirection;
  slides?: CarouselSlide[];
  /** Embed: the script body. The script name stays in `text`. */
  script?: string;
  /** Data display: the chart it shows. */
  chart?: DataChart;
}

export interface ChatNodeData extends Record<string, unknown> {
  name: string;
  fallbackName: string;
  elements: NodeElement[];
  aiEnabled: boolean;
  promptId?: string;
  isNew?: boolean;
}

export type ChatFlowNode = Node<ChatNodeData, 'chat'>;

export interface ConnectorData extends Record<string, unknown> {
  locked: boolean;
}

export type ConnectorFlowEdge = Edge<ConnectorData, 'connector'>;

export interface AiPrompt {
  id: string;
  name: string;
  keyword: string;
  alternatives: string[];
  nodeId: string;
}

export interface GraphState {
  nodes: ChatFlowNode[];
  edges: ConnectorFlowEdge[];
  prompts: AiPrompt[];
}

export type RightPanelState =
  | { kind: 'none' }
  | { kind: 'nodes' }
  | { kind: 'search' }
  | { kind: 'nodeDetails'; nodeId: string; elementId?: string; buttonId?: string }
  | { kind: 'ai' }
  | { kind: 'promptDetails'; draft: AiPrompt; isNew: boolean }
  | { kind: 'test'; startNodeId?: string; mode: 'full' | 'min'; runId: number };

export const OUT_HANDLE = 'out';
/** Second drag point on nodes that are not button nodes; it feeds the same single "next" connection as OUT_HANDLE. */
export const OUT_RIGHT_HANDLE = 'out-right';
export const isOutHandle = (handle?: string | null) => !handle || handle === OUT_HANDLE || handle === OUT_RIGHT_HANDLE;
export const buttonHandleId = (buttonId: string) => `btn-${buttonId}`;
export const inputBranchHandle = (elementId: string, branch: 'true' | 'false') => `in-${branch}-${elementId}`;

/** Customer input kinds from the user-input menu. */
export type InputKind =
  | 'text'
  | 'numeric'
  | 'media'
  | 'document'
  | 'dropdown'
  | 'checklist'
  | 'radio'
  | 'date'
  | 'dateRange'
  | 'time'
  | 'timeslot'
  | 'email'
  | 'phone'
  | 'website'
  | 'address'
  | 'country'
  | 'city'
  | 'zip'
  | 'card'
  | 'bank';

export interface InputRule {
  id: string;
  /** How this rule joins the one above it. The first rule ignores it. */
  join: 'and' | 'or';
  operator: string;
  value: string;
}

export interface InputCondition {
  name: string;
  rules: InputRule[];
}

export function nodeLabel(data: ChatNodeData): string {
  return data.name.trim() || data.fallbackName;
}
