import type { NodeElement } from './types';

/** Colours offered by the text editor's colour swatch. */
export const TEXT_COLORS: Array<{ value: string; label: string }> = [
  { value: '#0b1029', label: 'Default' },
  { value: '#55596b', label: 'Grey' },
  { value: '#005fec', label: 'Blue' },
  { value: '#2e568a', label: 'Navy' },
  { value: '#3e0093', label: 'Purple' },
  { value: '#304a01', label: 'Green' },
  { value: '#c33000', label: 'Red' },
];

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'SPAN', 'FONT', 'BR', 'DIV', 'P']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE', 'META', 'LINK']);
const STYLES = ['color', 'font-weight', 'font-style', 'text-decoration-line', 'text-decoration'];

function parse(html: string): DocumentFragment {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content;
}

function serialize(fragment: DocumentFragment): string {
  const box = document.createElement('div');
  box.append(fragment);
  return box.innerHTML;
}

function safeHref(raw: string | null): string | null {
  const href = raw?.trim();
  if (!href) return null;
  if (/^(https?:|mailto:)/i.test(href)) return href;
  return /^[a-z][a-z\d+.-]*:/i.test(href) ? null : normalizeUrl(href);
}

/** Turns "www.site.com" or "name@site.com" into a link target. */
export function normalizeUrl(input: string): string {
  const url = input.trim();
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url.replace(/^\/+/, '')}`;
}

function clean(parent: ParentNode) {
  for (const node of [...parent.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) continue;
    if (node.nodeType !== Node.ELEMENT_NODE || DROP.has((node as Element).tagName)) {
      node.remove();
      continue;
    }
    const el = node as HTMLElement;
    clean(el);
    if (!KEEP.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      continue;
    }
    const styles = STYLES.map((p) => [p, el.style.getPropertyValue(p)] as const).filter(([, v]) => v);
    const fontColor = el.tagName === 'FONT' ? el.getAttribute('color') : null;
    const href = el.tagName === 'A' ? safeHref(el.getAttribute('href')) : null;
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);

    let out: HTMLElement = el;
    if (el.tagName === 'FONT') {
      out = document.createElement('span');
      out.append(...el.childNodes);
      el.replaceWith(out);
      if (fontColor) out.style.color = fontColor;
    }
    for (const [p, v] of styles) out.style.setProperty(p, v);
    if (out.tagName === 'A') {
      if (!href) {
        out.replaceWith(...out.childNodes);
        continue;
      }
      out.setAttribute('href', href);
      out.setAttribute('target', '_blank');
      out.setAttribute('rel', 'noopener noreferrer');
    }
    if (out.tagName === 'SPAN' && !out.getAttribute('style')) out.replaceWith(...out.childNodes);
  }
}

/** Keeps only the inline formatting the editor can produce; returns '' when there is no visible text. */
export function sanitizeHtml(html: string): string {
  const fragment = parse(html);
  clean(fragment);
  const out = serialize(fragment);
  return htmlToText(out).trim() ? out : '';
}

export function htmlToText(html: string): string {
  const fragment = parse(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n'));
  return (fragment.textContent ?? '').replace(/\n+$/, '');
}

export function textToHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

export function elementHtml(el: NodeElement): string {
  return el.html ?? textToHtml(el.text ?? '');
}
