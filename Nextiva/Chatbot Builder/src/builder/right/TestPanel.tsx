import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Angry,
  CirclePlay,
  ExternalLink,
  FoldVertical,
  Frown,
  Image,
  Laugh,
  Mail,
  Meh,
  MessageSquare,
  Paperclip,
  SendHorizontal,
  Smile,
  Star,
  ThumbsDown,
  ThumbsUp,
  UnfoldVertical,
  X,
} from 'lucide-react';
import glyphIcon from '../../assets/buttons/glyph.svg';
import { cx, IconButton } from '../../design-system';
import { useBuilder } from '../store';
import { MediaPreview } from '../MediaTiles';
import { EMOJI_RATINGS, ratingChoices, ratingMatches, ratingStyleOf } from '../feedback';
import type { ButtonItem, ChatFlowNode, ConnectorFlowEdge, DataChart, MediaItem, NodeElement, RatingStyle } from '../types';
import { DataChartView } from '../DataChartView';
import { OUT_HANDLE, buttonHandleId, inputBranchHandle, isOutHandle, nodeLabel } from '../types';
import { elementSpec } from '../elements';
import { elementHtml } from '../richText';
import { uid } from '../uid';

type Msg =
  | { id: string; from: 'bot'; kind: 'text'; text: string; html?: string }
  | { id: string; from: 'bot'; kind: 'media'; text: string; items?: MediaItem[] }
  | { id: string; from: 'bot'; kind: 'chart'; chart: DataChart }
  | { id: string; from: 'bot'; kind: 'buttons'; nodeId: string; buttons: ButtonItem[]; answered?: string }
  | {
      id: string;
      from: 'bot';
      kind: 'rating';
      nodeId: string;
      style: RatingStyle;
      choices: { id: string; label: string }[];
      answered?: string;
    }
  | { id: string; from: 'user'; text: string }
  | { id: string; from: 'system'; text: string };

type Await = { kind: 'choice' | 'text' | 'none'; nodeId: string | null; placeholder?: string };

const TYPING_MS = 550;

function findRoot(nodes: ChatFlowNode[], edges: ConnectorFlowEdge[]): ChatFlowNode | undefined {
  const targets = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !targets.has(n.id));
  return [...(roots.length ? roots : nodes)].sort((a, b) => a.position.y - b.position.y)[0];
}

/** Numeric conditions can be checked against the answer. Null means the tester picks the branch. */
function numericBranch(el: NodeElement, answer: string): boolean | null {
  if (el.inputKind !== 'numeric' || !el.condition?.rules.length) return null;
  const raw = answer.trim().replace(/,/g, '');
  const n = Number(raw);
  const isNumber = raw !== '' && Number.isFinite(n);
  let result: boolean | null = null;
  for (const rule of el.condition.rules) {
    const target = Number(rule.value);
    let ok: boolean;
    switch (rule.operator) {
      case 'Is a number':
        ok = isNumber;
        break;
      case 'Equals':
        ok = isNumber && n === target;
        break;
      case 'Greater than':
        ok = isNumber && n > target;
        break;
      case 'Less than':
        ok = isNumber && n < target;
        break;
      default:
        return null;
    }
    result = result === null ? ok : rule.join === 'or' ? result || ok : result && ok;
  }
  return result;
}

export function TestPanel({ startNodeId, mode, runId }: { startNodeId?: string; mode: 'full' | 'min'; runId: number }) {
  const { nodes, edges, prompts, setRightPanel, setTestActiveNodeId, focusNode } = useBuilder();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [awaiting, setAwaiting] = useState<Await>({ kind: 'none', nodeId: null });
  const [draft, setDraft] = useState('');
  const timers = useRef<number[]>([]);
  const answers = useRef(new Map<string, string>());
  const scrollRef = useRef<HTMLDivElement>(null);

  const graph = useRef({ nodes, edges, prompts });
  graph.current = { nodes, edges, prompts };

  const now = useMemo(() => new Date(), []);
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const push = useCallback((m: Msg) => setMessages((list) => [...list, m]), []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const runNode = useCallback(
    (nodeId: string) => {
      const { nodes: ns, edges: es } = graph.current;
      const node = ns.find((n) => n.id === nodeId);
      if (!node) return;
      setTestActiveNodeId(nodeId);
      focusNode(nodeId);
      setAwaiting({ kind: 'none', nodeId });

      const queue: Msg[] = [];
      let wait: Await = { kind: 'none', nodeId };
      let handoff: string | null = null;
      let branch: string | null = null;

      for (const el of node.data.elements) {
        switch (el.type) {
          case 'text':
            if (el.text?.trim()) queue.push({ id: uid('m'), from: 'bot', kind: 'text', text: el.text, html: elementHtml(el) });
            break;
          case 'media':
            if (el.media?.length) queue.push({ id: uid('m'), from: 'bot', kind: 'media', text: elementSpec(el.type).label, items: el.media });
            break;
          case 'dataDisplay':
            if (el.chart) queue.push({ id: uid('m'), from: 'bot', kind: 'chart', chart: el.chart });
            else queue.push({ id: uid('m'), from: 'bot', kind: 'media', text: el.text || elementSpec(el.type).label });
            break;
          case 'carousel':
            for (const slide of el.slides ?? []) {
              if (slide.media) queue.push({ id: uid('m'), from: 'bot', kind: 'media', text: slide.media.name, items: [slide.media] });
              if (slide.text?.trim()) queue.push({ id: uid('m'), from: 'bot', kind: 'text', text: slide.text.trim(), html: slide.html });
              if (slide.buttonLabel?.trim()) {
                queue.push({
                  id: uid('m'),
                  from: 'bot',
                  kind: 'buttons',
                  nodeId,
                  buttons: [{ id: slide.id, label: slide.buttonLabel.trim(), kind: 'link', url: slide.buttonUrl }],
                });
              }
            }
            if (!(el.slides ?? []).some((slide) => slide.media || slide.text?.trim() || slide.buttonLabel?.trim())) {
              queue.push({
                id: uid('m'),
                from: 'bot',
                kind: 'text',
                text: el.slideDirection === 'vertical' ? 'Vertical carousel' : 'Horizontal carousel',
              });
            }
            break;
          case 'buttons':
            queue.push({ id: uid('m'), from: 'bot', kind: 'buttons', nodeId, buttons: el.buttons ?? [] });
            wait = { kind: 'choice', nodeId };
            break;
          case 'dropdown':
            queue.push({
              id: uid('m'),
              from: 'bot',
              kind: 'buttons',
              nodeId,
              buttons: (el.options ?? []).filter(Boolean).map((o, i) => ({ id: `opt-${i}`, label: o, kind: 'node' })),
            });
            wait = { kind: 'choice', nodeId };
            break;
          case 'feedback':
            queue.push({
              id: uid('m'),
              from: 'bot',
              kind: 'rating',
              nodeId,
              style: ratingStyleOf(el),
              choices: ratingChoices(el),
            });
            wait = { kind: 'choice', nodeId };
            break;
          case 'userInput': {
            if (!el.source) {
              if (el.text?.trim()) queue.push({ id: uid('m'), from: 'bot', kind: 'text', text: el.text.trim() });
              wait = { kind: 'text', nodeId, placeholder: 'Write your message' };
              break;
            }
            const saved = answers.current.get(el.source);
            const ok = saved === undefined ? null : numericBranch(el, saved);
            const name = el.condition?.name.trim() || 'Condition';
            if (ok === null) {
              queue.push({
                id: uid('m'),
                from: 'bot',
                kind: 'buttons',
                nodeId,
                buttons: [
                  { id: inputBranchHandle(el.id, 'true'), label: 'True', kind: 'node' },
                  { id: inputBranchHandle(el.id, 'false'), label: 'False', kind: 'node' },
                ],
              });
              wait = { kind: 'choice', nodeId };
            } else {
              queue.push({ id: uid('m'), from: 'system', text: `“${name}” is ${ok ? 'true' : 'false'} for ${el.source}: ${saved}` });
              branch = inputBranchHandle(el.id, ok ? 'true' : 'false');
            }
            break;
          }
          case 'email':
          case 'phone':
          case 'calendar':
            wait = { kind: 'text', nodeId, placeholder: el.text || 'Write your message' };
            break;
          case 'transfer':
            queue.push({ id: uid('m'), from: 'system', text: `Conversation handed over to ${el.text || 'an agent'}.` });
            handoff = 'end';
            break;
          case 'embed': {
            const name = el.text?.trim() || 'Custom script';
            queue.push({ id: uid('m'), from: 'system', text: el.script?.trim() ? `Runs “${name}”.` : `“${name}” has no script yet.` });
            break;
          }
          case 'api':
            queue.push({ id: uid('m'), from: 'system', text: `${elementSpec(el.type).nodeLabel} runs here.` });
            break;
        }
      }

      if (!node.data.elements.length) {
        queue.push({ id: uid('m'), from: 'system', text: `“${nodeLabel(node.data)}” has no elements yet.` });
      }

      queue.forEach((m, i) => {
        later(i * TYPING_MS, () => setTyping(true));
        later((i + 1) * TYPING_MS, () => {
          setTyping(false);
          push(m);
        });
      });

      later(queue.length * TYPING_MS + 50, () => {
        if (wait.kind !== 'none' || handoff) {
          setAwaiting(wait);
          return;
        }
        if (branch) {
          const edge = es.find((e) => e.source === nodeId && e.sourceHandle === branch);
          if (edge) runNode(edge.target);
          else push({ id: uid('m'), from: 'system', text: 'That branch isn’t connected to a node yet.' });
          return;
        }
        const next = es.find((e) => e.source === nodeId && isOutHandle(e.sourceHandle));
        if (next) runNode(next.target);
        else {
          push({ id: uid('m'), from: 'system', text: 'End of flow. Type a message to try AI prompts.' });
          setAwaiting({ kind: 'text', nodeId: null });
        }
      });
    },
    [focusNode, later, push, setTestActiveNodeId],
  );

  useEffect(() => {
    setMessages([]);
    setTyping(false);
    answers.current.clear();
    const root = startNodeId ? graph.current.nodes.find((n) => n.id === startNodeId) : findRoot(graph.current.nodes, graph.current.edges);
    if (root) runNode(root.id);
    else push({ id: uid('m'), from: 'system', text: 'Add a node to the canvas to start testing.' });
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      setTestActiveNodeId(null);
    };
  }, [startNodeId, runNode, push, setTestActiveNodeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const follow = (fromNode: string, handle: string, label: string) => {
    const edge = graph.current.edges.find((e) => e.source === fromNode && (handle === OUT_HANDLE ? isOutHandle(e.sourceHandle) : e.sourceHandle === handle));
    if (edge) later(250, () => runNode(edge.target));
    else push({ id: uid('m'), from: 'system', text: `“${label}” isn’t connected to a node yet.` });
  };

  const answerButton = (msgId: string, nodeId: string, b: ButtonItem) => {
    if (b.kind === 'link') {
      push({ id: uid('m'), from: 'system', text: `Opens ${b.url || 'a link'} in a new tab.` });
      return;
    }
    if (b.kind === 'email') {
      push({ id: uid('m'), from: 'system', text: `Starts an email to ${b.url || 'your team'}.` });
      return;
    }
    setMessages((list) => list.map((m) => (m.id === msgId && m.from === 'bot' && m.kind === 'buttons' ? { ...m, answered: b.id } : m)));
    push({ id: uid('m'), from: 'user', text: b.label });
    setAwaiting({ kind: 'none', nodeId });
    const handle = b.id.startsWith('opt-') ? OUT_HANDLE : b.id.startsWith('in-') ? b.id : buttonHandleId(b.id);
    follow(nodeId, handle, b.label);
  };

  const answerRating = (msgId: string, nodeId: string, value: string, label: string) => {
    setMessages((list) => list.map((m) => (m.id === msgId && m.from === 'bot' && m.kind === 'rating' ? { ...m, answered: value } : m)));
    const style = graph.current.nodes.find((n) => n.id === nodeId)?.data.elements.find((el) => el.type === 'feedback');
    const text = style && ratingStyleOf(style) === 'star' ? `${value} ${value === '1' ? 'star' : 'stars'}` : label;
    push({ id: uid('m'), from: 'user', text });
    setAwaiting({ kind: 'none', nodeId });
    const rule = style?.condition?.rules[0];
    if (style?.condition) {
      const ok = Boolean(rule && ratingMatches(ratingStyleOf(style), rule.operator, value, rule.value));
      follow(nodeId, inputBranchHandle(style.id, ok ? 'true' : 'false'), ok ? 'True' : 'False');
      return;
    }
    const edge = graph.current.edges.find((e) => e.source === nodeId && isOutHandle(e.sourceHandle));
    if (edge) later(250, () => runNode(edge.target));
    else later(TYPING_MS, () => push({ id: uid('m'), from: 'bot', kind: 'text', text: 'Thanks for your feedback!' }));
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    push({ id: uid('m'), from: 'user', text });

    const { nodes: ns, edges: es, prompts: ps } = graph.current;
    const lower = text.toLowerCase();
    const pending = [...messages].reverse().find((m) => m.from === 'bot' && m.kind === 'buttons' && !m.answered);
    if (pending?.from === 'bot' && pending.kind === 'buttons') {
      const hit = pending.buttons.find((b) => b.kind === 'node' && b.prompt?.trim() && lower.includes(b.prompt.trim().toLowerCase()));
      if (hit) {
        setMessages((list) => list.map((m) => (m.id === pending.id && m.from === 'bot' && m.kind === 'buttons' ? { ...m, answered: hit.id } : m)));
        push({ id: uid('m'), from: 'system', text: `Element prompt matched “${hit.label}”` });
        setAwaiting({ kind: 'none', nodeId: pending.nodeId });
        follow(pending.nodeId, buttonHandleId(hit.id), hit.label);
        return;
      }
    }
    const match = ps.find((p) => {
      const node = ns.find((n) => n.id === p.nodeId);
      if (!node?.data.aiEnabled) return false;
      return [p.keyword, ...p.alternatives].some((k) => k.trim() && lower.includes(k.trim().toLowerCase()));
    });
    if (match) {
      push({ id: uid('m'), from: 'system', text: `AI prompt “${match.name}” matched` });
      later(250, () => runNode(match.nodeId));
      return;
    }
    if (awaiting.kind === 'text' && awaiting.nodeId) {
      const asked = ns.find((n) => n.id === awaiting.nodeId)?.data.elements.find((el) => el.type === 'userInput');
      if (asked?.savedName) answers.current.set(asked.savedName, text);
      const input = asked?.condition ? asked : undefined;
      const ok = input ? numericBranch(input, text) : null;
      if (input && ok !== null) {
        push({ id: uid('m'), from: 'system', text: `“${input.condition?.name.trim() || 'Condition'}” is ${ok ? 'true' : 'false'}` });
        setAwaiting({ kind: 'none', nodeId: awaiting.nodeId });
        follow(awaiting.nodeId, inputBranchHandle(input.id, ok ? 'true' : 'false'), ok ? 'True' : 'False');
        return;
      }
      if (input) {
        setAwaiting({ kind: 'choice', nodeId: awaiting.nodeId });
        push({
          id: uid('m'),
          from: 'bot',
          kind: 'buttons',
          nodeId: awaiting.nodeId,
          buttons: [
            { id: inputBranchHandle(input.id, 'true'), label: 'True', kind: 'node' },
            { id: inputBranchHandle(input.id, 'false'), label: 'False', kind: 'node' },
          ],
        });
        return;
      }
      const edge = es.find((x) => x.source === awaiting.nodeId && isOutHandle(x.sourceHandle));
      if (edge) {
        later(250, () => runNode(edge.target));
        return;
      }
    }
    later(TYPING_MS, () =>
      push({ id: uid('m'), from: 'bot', kind: 'text', text: 'Sorry, I didn’t get that. Please pick one of the options above.' }),
    );
  };

  const close = () => setRightPanel({ kind: 'none' });
  const setMode = (m: 'full' | 'min') => setRightPanel({ kind: 'test', startNodeId, mode: m, runId });

  const body = (
    <>
      <div ref={scrollRef} className="cb-chat__scroll">
        <div className="cb-chat__date t-overline t-overline--heavy">{dateLabel}</div>
        {messages.map((m) => {
          switch (m.from) {
            case 'user':
              return (
                <div key={m.id} className="cb-chat__bubble is-user">
                  {m.text}
                </div>
              );
            case 'system':
              return (
                <div key={m.id} className="cb-chat__system t-caption">
                  {m.text}
                </div>
              );
            case 'bot':
              if (m.kind === 'text')
                return (
                  <div key={m.id} className="cb-chat__group">
                    {m.html ? (
                      <div className="cb-chat__bubble cb-rich" dangerouslySetInnerHTML={{ __html: m.html }} />
                    ) : (
                      <div className="cb-chat__bubble">{m.text}</div>
                    )}
                    <div className="cb-chat__time t-caption">{timeLabel}</div>
                  </div>
                );
              if (m.kind === 'media' && m.items)
                return (
                  <div key={m.id} className="cb-chat__gallery">
                    <MediaPreview items={m.items} />
                  </div>
                );
              if (m.kind === 'chart')
                return (
                  <div key={m.id} className="cb-chat__bubble cb-chat__chart">
                    <DataChartView chart={m.chart} />
                  </div>
                );
              if (m.kind === 'media')
                return (
                  <div key={m.id} className="cb-chat__bubble cb-chat__media">
                    <Image size={20} />
                    <span className="t-caption">{m.text}</span>
                  </div>
                );
              if (m.kind === 'buttons')
                return (
                  <div key={m.id} className="cb-chat__choices">
                    {m.buttons.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        disabled={Boolean(m.answered)}
                        className={cx('cb-chat__choice', b.kind !== 'node' && 'is-link', m.answered === b.id && 'is-picked')}
                        onClick={() => answerButton(m.id, m.nodeId, b)}
                      >
                        {b.look === 'media' && <CirclePlay size={14} />}
                        {b.look === 'icon' && <img src={glyphIcon} alt="" width={14} height={12} />}
                        {b.label}
                        {b.kind === 'link' && <ExternalLink size={14} />}
                        {b.kind === 'email' && <Mail size={14} />}
                      </button>
                    ))}
                  </div>
                );
              return (
                <div key={m.id} className="cb-chat__rating" role="radiogroup" aria-label="Rate your experience">
                  {m.style === 'star'
                    ? m.choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          role="radio"
                          aria-checked={m.answered === choice.id}
                          aria-label={`${choice.label} star${choice.label === '1' ? '' : 's'}`}
                          disabled={m.answered !== undefined}
                          className={cx('cb-chat__star', m.answered !== undefined && Number(choice.id) <= Number(m.answered) && 'is-on')}
                          onClick={() => answerRating(m.id, m.nodeId, choice.id, choice.label)}
                        >
                          <Star size={18} />
                        </button>
                      ))
                    : m.style === 'emoji'
                      ? EMOJI_RATINGS.map((face, index) => {
                          const Icon = [Laugh, Smile, Meh, Frown, Angry][index];
                          return (
                            <button
                              key={face.id}
                              type="button"
                              role="radio"
                              aria-checked={m.answered === face.id}
                              aria-label={face.label}
                              disabled={m.answered !== undefined}
                              className={cx('cb-chat__face', `is-${face.tone}`, m.answered === face.id && 'is-picked')}
                              onClick={() => answerRating(m.id, m.nodeId, face.id, face.label)}
                            >
                              <Icon size={18} />
                            </button>
                          );
                        })
                      : m.style === 'like'
                        ? [
                            { id: 'like', label: 'Like', icon: ThumbsUp },
                            { id: 'dislike', label: 'Dislike', icon: ThumbsDown },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              role="radio"
                              aria-checked={m.answered === item.id}
                              aria-label={item.label}
                              disabled={m.answered !== undefined}
                              className={cx('cb-chat__thumb', m.answered === item.id && 'is-picked')}
                              onClick={() => answerRating(m.id, m.nodeId, item.id, item.label)}
                            >
                              <item.icon size={18} />
                            </button>
                          ))
                        : m.choices.map((choice) => (
                            <button
                              key={choice.id}
                              type="button"
                              role="radio"
                              aria-checked={m.answered === choice.id}
                              disabled={m.answered !== undefined}
                              className={cx('cb-chat__choice', m.answered === choice.id && 'is-picked')}
                              onClick={() => answerRating(m.id, m.nodeId, choice.id, choice.label)}
                            >
                              {choice.label}
                            </button>
                          ))}
                </div>
              );
          }
        })}
        {typing && (
          <div className="cb-chat__typing" aria-label="Bot is typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      <form className="cb-chat__composer" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={awaiting.placeholder ?? 'Write your message'}
          aria-label="Write your message"
        />
        <Smile size={16} className="cb-chat__deco" />
        <Paperclip size={16} className="cb-chat__deco" />
        <button type="submit" className="cb-chat__send" aria-label="Send message" disabled={!draft.trim()}>
          <SendHorizontal size={16} />
        </button>
      </form>
    </>
  );

  if (mode === 'min') {
    return (
      <div className="cb-chat cb-chat--widget">
        <div className="cb-chat__window">
          <header className="cb-chat__brand">
            <span className="cb-chat__logo" aria-hidden>
              <MessageSquare size={16} />
            </span>
            <span className="cb-chat__brand-name">Lighthouse Inc.</span>
            <IconButton label="Expand test panel" size={28} className="cb-chat__brand-btn" icon={<UnfoldVertical size={16} />} onClick={() => setMode('full')} />
            <IconButton label="Close test" size={28} className="cb-chat__brand-btn" icon={<X size={16} />} onClick={close} />
          </header>
          {body}
          <footer className="cb-chat__powered">
            Powered by <b>nextiva</b>
          </footer>
        </div>
        <button type="button" className="cb-chat__launcher" aria-label="Close chat preview" onClick={close}>
          <MessageSquare size={18} />
        </button>
      </div>
    );
  }

  return (
    <section className="ds-panel cb-chat cb-chat--panel" aria-label="Test chatbot">
      <header className="ds-panel__header">
        <h2 className="ds-panel__title t-overline" style={{ margin: 0 }}>
          Test
        </h2>
        <IconButton label="Show as chat widget" size={24} variant="bordered" icon={<FoldVertical size={14} />} onClick={() => setMode('min')} />
        <IconButton label="Close test" size={24} icon={<X size={16} />} onClick={close} />
      </header>
      {body}
    </section>
  );
}
