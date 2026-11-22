import type { NodeElement, RatingStyle } from './types';

export const RATING_SYSTEMS: { id: RatingStyle; label: string }[] = [
  { id: 'star', label: 'Star' },
  { id: 'emoji', label: 'Emoji' },
  { id: 'like', label: 'Like/Dislike' },
  { id: 'number', label: 'Numeric' },
  { id: 'custom', label: 'Custom' },
];

export const EMOJI_RATINGS = [
  { id: 'delighted', label: 'Delighted', tone: '1' },
  { id: 'happy', label: 'Happy', tone: '2' },
  { id: 'okay', label: 'Okay', tone: '3' },
  { id: 'unhappy', label: 'Unhappy', tone: '4' },
  { id: 'angry', label: 'Angry', tone: '5' },
] as const;

export const LIKE_RATINGS = [
  { id: 'like', label: 'Like' },
  { id: 'dislike', label: 'Dislike' },
] as const;

export const FEEDBACK_NAME = 'User feedback';

export function ratingStyleOf(element: NodeElement): RatingStyle {
  return element.ratingStyle ?? 'star';
}

export function ratingScaleOf(element: NodeElement): 5 | 10 {
  return element.ratingScale === 10 ? 10 : 5;
}

export function ratingTypeName(style: RatingStyle): string {
  if (style === 'star') return 'Star rating';
  if (style === 'emoji') return 'Emoji';
  if (style === 'like') return 'Like or dislike';
  if (style === 'number') return 'Numeric';
  return 'Custom';
}

/** What the condition compares, shown in the first column of the condition row. */
export function ratingMeasure(style: RatingStyle): string {
  if (style === 'star') return 'Number of stars';
  if (style === 'number') return 'Number';
  if (style === 'emoji') return 'Emoji';
  if (style === 'like') return 'Reaction';
  return 'Rating';
}

export function ratingOperators(style: RatingStyle): string[] {
  return style === 'star' || style === 'number' ? ['Equals', 'Greater than', 'Less than'] : ['Equals'];
}

export function ratingChoices(element: NodeElement): { id: string; label: string }[] {
  const style = ratingStyleOf(element);
  if (style === 'star' || style === 'number') {
    return Array.from({ length: ratingScaleOf(element) }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }));
  }
  if (style === 'emoji') return EMOJI_RATINGS.map((item) => ({ id: item.id, label: item.label }));
  if (style === 'like') return LIKE_RATINGS.map((item) => ({ id: item.id, label: item.label }));
  const labels = (element.options ?? []).map((option) => option.trim()).filter(Boolean);
  const list = labels.length ? labels : ['Rating 1', 'Rating 2'];
  return list.map((label) => ({ id: label, label }));
}

export function ratingMatches(style: RatingStyle, operator: string, picked: string, expected: string): boolean {
  if (style === 'star' || style === 'number') {
    const left = Number(picked);
    const right = Number(expected);
    if (Number.isNaN(left) || Number.isNaN(right)) return false;
    if (operator === 'Greater than') return left > right;
    if (operator === 'Less than') return left < right;
    return operator === 'Equals' && left === right;
  }
  return operator === 'Equals' && picked === expected;
}
