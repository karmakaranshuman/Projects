import dagre from '@dagrejs/dagre';
import type { ChatFlowNode, ConnectorFlowEdge } from './types';
import { buttonHandleId } from './types';

const FALLBACK = { width: 260, height: 140 };

/** Top-to-bottom tree layout. Edges are ordered by the source button order so branches read left → right. */
export function computeTidyLayout(nodes: ChatFlowNode[], edges: ConnectorFlowEdge[]): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, {
      width: n.measured?.width ?? FALLBACK.width,
      height: n.measured?.height ?? FALLBACK.height,
    });
  }

  const order = (e: ConnectorFlowEdge) => {
    if (e.sourceHandle?.startsWith('in-true-')) return 1000;
    if (e.sourceHandle?.startsWith('in-false-')) return 1001;
    const src = nodes.find((n) => n.id === e.source);
    const buttons = src?.data.elements.flatMap((el) => el.buttons ?? []) ?? [];
    const idx = buttons.findIndex((b) => buttonHandleId(b.id) === e.sourceHandle);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  // Fallback loops point back at an earlier step. They stay on the canvas, but ranking uses the
  // forward tree so a retry doesn't drag the whole flow into one long column.
  for (const e of forwardEdges(nodes, edges, order)) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  // Dagre only minimises crossings, so siblings can come out in any order. Re-deal each rank's
  // horizontal slots in flow order (breadth-first, children in button order) and top-align the rank.
  const flowOrder = breadthFirstOrder(nodes, edges, order);
  const ranks = new Map<number, string[]>();
  for (const n of nodes) {
    const y = Math.round(g.node(n.id).y);
    ranks.set(y, [...(ranks.get(y) ?? []), n.id]);
  }
  const laidOut = new Map<string, { x: number; y: number }>();
  for (const [centerY, ids] of ranks) {
    const slots = ids.map((id) => g.node(id).x).sort((a, b) => a - b);
    const top = centerY - Math.max(...ids.map((id) => g.node(id).height)) / 2;
    [...ids]
      .sort((a, b) => flowOrder.get(a)! - flowOrder.get(b)!)
      .forEach((id, i) => laidOut.set(id, { x: slots[i] - g.node(id).width / 2, y: top }));
  }

  const anchor = nodes[0]?.position ?? { x: 0, y: 0 };
  const first = nodes[0] ? laidOut.get(nodes[0].id) : undefined;
  const dx = first ? anchor.x - first.x : 0;
  const dy = first ? anchor.y - first.y : 0;

  const result = new Map<string, { x: number; y: number }>();
  for (const [id, p] of laidOut) result.set(id, { x: p.x + dx, y: p.y + dy });
  return result;
}

function forwardEdges(
  nodes: ChatFlowNode[],
  edges: ConnectorFlowEdge[],
  edgeOrder: (e: ConnectorFlowEdge) => number,
): ConnectorFlowEdge[] {
  const incoming = new Set(edges.map((e) => e.target));
  const depth = new Map<string, number>();
  const queue = nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id);
  queue.forEach((id) => depth.set(id, 0));
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const next = (depth.get(id) ?? 0) + 1;
    edges
      .filter((e) => e.source === id)
      .sort((a, b) => edgeOrder(a) - edgeOrder(b))
      .forEach((e) => {
        if (depth.has(e.target)) return;
        depth.set(e.target, next);
        queue.push(e.target);
      });
  }
  return edges.filter((e) => (depth.get(e.target) ?? 0) > (depth.get(e.source) ?? 0));
}

function breadthFirstOrder(
  nodes: ChatFlowNode[],
  edges: ConnectorFlowEdge[],
  edgeOrder: (e: ConnectorFlowEdge) => number,
): Map<string, number> {
  const targets = new Set(edges.map((e) => e.target));
  const queue = nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
  const seen = new Map<string, number>();
  const visit = (id: string) => {
    if (!seen.has(id)) {
      seen.set(id, seen.size);
      queue.push(id);
    }
  };
  for (const id of queue.splice(0)) visit(id);
  while (queue.length) {
    const id = queue.shift()!;
    edges
      .filter((e) => e.source === id)
      .sort((a, b) => edgeOrder(a) - edgeOrder(b))
      .forEach((e) => visit(e.target));
  }
  for (const n of nodes) visit(n.id);
  return seen;
}
