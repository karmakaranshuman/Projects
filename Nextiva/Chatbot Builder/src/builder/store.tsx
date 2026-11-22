import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import { canAddElement, createElement, opensPanelOnAdd, placeElement } from './elements';
import { FIT_VIEW } from './fit';
import { computeTidyLayout } from './layout';
import { queryWandTargets, rearrangeWandTargets, scenarioGraph, type ScenarioId } from './scenarios';
import type {
  AiPrompt,
  ChatFlowNode,
  ChatNodeData,
  ConnectorFlowEdge,
  ElementType,
  GraphState,
  NodeElement,
  RightPanelState,
} from './types';
import { buttonHandleId, inputBranchHandle, isOutHandle, nodeLabel } from './types';
import { uid } from './uid';

const HISTORY_LIMIT = 60;

export interface DropTarget {
  nodeId: string;
  allowed: boolean;
}

export interface LeftPanelState {
  expanded: boolean;
  advanced: boolean;
}

interface BuilderContextValue extends GraphState {
  onNodesChange: (changes: NodeChange<ChatFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ConnectorFlowEdge>[]) => void;
  beforeDelete: (args: { nodes: ChatFlowNode[]; edges: ConnectorFlowEdge[] }) => Promise<{ nodes: ChatFlowNode[]; edges: ConnectorFlowEdge[] }>;

  record: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  addNodeWithElement: (type: ElementType, position: XYPosition) => string;
  addEmptyNodeAndConnect: (source: string, sourceHandle: string | null, position: XYPosition) => void;
  addElementToNode: (nodeId: string, type: ElementType) => boolean;
  updateNodeData: (nodeId: string, patch: Partial<ChatNodeData>) => void;
  updateElement: (nodeId: string, elementId: string, patch: Partial<NodeElement>) => void;
  removeElement: (nodeId: string, elementId: string) => void;
  deleteNode: (nodeId: string) => void;
  requestDeleteElement: (nodeId: string, elementId: string) => void;
  requestDeleteNode: (nodeId: string) => void;
  deleteConfirm: { kind: 'element' } | { kind: 'node'; count: number } | null;
  resolveDeleteConfirm: (ok: boolean) => void;
  duplicateNode: (nodeId: string) => void;
  connect: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  toggleEdgeLock: (edgeId: string) => void;
  setNodeAi: (nodeId: string, enabled: boolean) => void;
  savePrompt: (prompt: AiPrompt) => void;
  deletePrompt: (promptId: string) => void;
  tidyLayout: () => void;
  loadScenario: (id: ScenarioId) => void;
  restartScenario: () => void;
  addTemplate: (template: GraphState, title: string) => void;

  scenario: ScenarioId;
  screen: 'library' | 'builder';
  botTitle: string;
  libraryCreate: boolean;
  libraryKey: number;
  setLibraryCreate: (create: boolean) => void;
  openLibrary: (create?: boolean) => void;
  startBot: (title: string, graph: GraphState, options?: { arrange?: boolean }) => void;
  arranging: boolean;
  rightPanel: RightPanelState;
  setRightPanel: Dispatch<SetStateAction<RightPanelState>>;
  openNodeDetails: (nodeId: string, elementId?: string) => void;
  openTest: (startNodeId?: string) => void;
  focusNode: (nodeId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  testActiveNodeId: string | null;
  setTestActiveNodeId: (id: string | null) => void;
  dragElement: ElementType | null;
  setDragElement: (type: ElementType | null) => void;
  dropTarget: DropTarget | null;
  setDropTarget: (target: DropTarget | null) => void;
  leftPanel: LeftPanelState;
  setLeftPanel: (next: LeftPanelState) => void;
  toast: string | null;
  showToast: (message: string | null) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder must be used inside <BuilderProvider>');
  return ctx;
}

function nextNodeIndex(nodes: ChatFlowNode[]): number {
  const used = nodes.map((n) => Number(/#(\d+)$/.exec(n.data.fallbackName)?.[1] ?? 0));
  return Math.max(0, ...used) + 1;
}

function makeNode(nodes: ChatFlowNode[], position: XYPosition, elements: NodeElement[]): ChatFlowNode {
  return {
    id: uid('node'),
    type: 'chat',
    position,
    selected: true,
    data: {
      name: '',
      fallbackName: `Node#${nextNodeIndex(nodes)}`,
      elements,
      aiEnabled: false,
      isNew: true,
    },
  };
}

function cloneElement(el: NodeElement): NodeElement {
  return {
    ...el,
    id: uid('el'),
    buttons: el.buttons?.map((b) => ({ ...b, id: uid('btn') })),
    options: el.options ? [...el.options] : undefined,
  };
}

/** Two handles share an outgoing slot when they are the same button, or both are the node's own output. */
function sameSlot(a?: string | null, b?: string | null): boolean {
  return isOutHandle(a) ? isOutHandle(b) : a === b;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function BuilderProvider({
  initialScenario,
  initialCreate = false,
  children,
}: {
  initialScenario: ScenarioId;
  initialCreate?: boolean;
  children: ReactNode;
}) {
  const rf = useReactFlow<ChatFlowNode, ConnectorFlowEdge>();

  const [graph, setGraphState] = useState<GraphState>(() => scenarioGraph(initialScenario));
  const graphRef = useRef(graph);
  const setGraph = useCallback((updater: (g: GraphState) => GraphState) => {
    setGraphState((prev) => {
      const next = updater(prev);
      graphRef.current = next;
      return next;
    });
  }, []);

  const historyRef = useRef<{ past: GraphState[]; future: GraphState[] }>({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
  const setHistory = useCallback((next: { past: GraphState[]; future: GraphState[] }) => {
    historyRef.current = next;
    setHistoryVersion((v) => v + 1);
  }, []);

  const [scenario, setScenario] = useState<ScenarioId>(initialScenario);
  const [screen, setScreen] = useState<'library' | 'builder'>(() =>
    initialScenario === 'welcome' || initialScenario === 'messy' ? 'builder' : 'library',
  );
  const [botTitle, setBotTitle] = useState('Whatsapp welcome bot');
  const [libraryCreate, setLibraryCreate] = useState(initialCreate);
  const [libraryKey, setLibraryKey] = useState(0);
  const [arranging, setArranging] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanelState>({ kind: 'none' });
  const [searchQuery, setSearchQuery] = useState('');
  const [testActiveNodeId, setTestActiveNodeId] = useState<string | null>(null);
  const [dragElement, setDragElement] = useState<ElementType | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [leftPanel, setLeftPanel] = useState<LeftPanelState>({ expanded: true, advanced: false });
  const [toast, showToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: 'element' } | { kind: 'node'; count: number } | null>(null);
  const deleteAnswer = useRef<((ok: boolean) => void) | null>(null);

  const askDelete = useCallback((prompt: { kind: 'element' } | { kind: 'node'; count: number }) => {
    if (deleteAnswer.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      deleteAnswer.current = resolve;
      setDeleteConfirm(prompt);
    });
  }, []);

  const resolveDeleteConfirm = useCallback((ok: boolean) => {
    const resolve = deleteAnswer.current;
    deleteAnswer.current = null;
    setDeleteConfirm(null);
    resolve?.(ok);
  }, []);

  const record = useCallback(() => {
    const { past } = historyRef.current;
    setHistory({ past: [...past.slice(-HISTORY_LIMIT), graphRef.current], future: [] });
  }, [setHistory]);

  const restore = useCallback((g: GraphState) => {
    graphRef.current = g;
    setGraphState(g);
  }, []);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    const prev = past.at(-1);
    if (!prev) return;
    setHistory({ past: past.slice(0, -1), future: [graphRef.current, ...future] });
    restore(prev);
  }, [setHistory, restore]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    const [next, ...rest] = future;
    if (!next) return;
    setHistory({ past: [...past, graphRef.current], future: rest });
    restore(next);
  }, [setHistory, restore]);

  const closePanelsForNode = useCallback((nodeId: string) => {
    setRightPanel((p) => (p.kind === 'nodeDetails' && p.nodeId === nodeId ? { kind: 'nodes' } : p));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<ChatFlowNode>[]) => {
      const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      setGraph((g) => ({
        ...g,
        nodes: applyNodeChanges(changes, g.nodes),
        prompts: removed.length
          ? g.prompts.map((p) => (removed.includes(p.nodeId) ? { ...p, nodeId: '' } : p))
          : g.prompts,
      }));
      removed.forEach(closePanelsForNode);
    },
    [setGraph, closePanelsForNode],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<ConnectorFlowEdge>[]) => {
      setGraph((g) => ({ ...g, edges: applyEdgeChanges(changes, g.edges) }));
    },
    [setGraph],
  );

  const beforeDelete = useCallback(
    async ({ nodes, edges }: { nodes: ChatFlowNode[]; edges: ConnectorFlowEdge[] }) => {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const allowedEdges = edges.filter((e) => !e.data?.locked || nodeIds.has(e.source) || nodeIds.has(e.target));
      if (allowedEdges.length < edges.length) showToast('Locked connectors can’t be deleted');
      if (nodes.length) {
        const ok = await askDelete({ kind: 'node', count: nodes.length });
        if (!ok) return { nodes: [], edges: [] };
        setTestActiveNodeId((id) => (id && nodeIds.has(id) ? null : id));
        record();
        return { nodes, edges: allowedEdges };
      }
      if (allowedEdges.length) record();
      return { nodes, edges: allowedEdges };
    },
    [askDelete, record],
  );

  const addNodeWithElement = useCallback(
    (type: ElementType, position: XYPosition) => {
      record();
      const element = createElement(type);
      const node = makeNode(graphRef.current.nodes, position, [element]);
      setGraph((g) => ({
        ...g,
        nodes: [...g.nodes.map((n) => ({ ...n, selected: false })), node],
      }));
      if (opensPanelOnAdd(type)) setRightPanel({ kind: 'nodeDetails', nodeId: node.id, elementId: element.id });
      return node.id;
    },
    [record, setGraph],
  );

  const connect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const existing = graphRef.current.edges.find((e) => e.source === c.source && sameSlot(e.sourceHandle, c.sourceHandle));
      if (existing?.data?.locked) {
        showToast('That connector is locked. Unlock it to reconnect.');
        return;
      }
      record();
      setGraph((g) => ({
        ...g,
        edges: [
          ...g.edges.filter((e) => e !== existing),
          {
            id: uid('edge'),
            type: 'connector',
            source: c.source,
            sourceHandle: c.sourceHandle,
            target: c.target,
            targetHandle: c.targetHandle,
            data: { locked: false },
          },
        ],
      }));
    },
    [record, setGraph],
  );

  const addEmptyNodeAndConnect = useCallback(
    (source: string, sourceHandle: string | null, position: XYPosition) => {
      const existing = graphRef.current.edges.find((e) => e.source === source && sameSlot(e.sourceHandle, sourceHandle));
      if (existing?.data?.locked) {
        showToast('That connector is locked. Unlock it to reconnect.');
        return;
      }
      record();
      const node = makeNode(graphRef.current.nodes, position, []);
      setGraph((g) => ({
        ...g,
        nodes: [...g.nodes.map((n) => ({ ...n, selected: false })), node],
        edges: [
          ...g.edges.filter((e) => e !== existing),
          { id: uid('edge'), type: 'connector', source, sourceHandle, target: node.id, data: { locked: false } },
        ],
      }));
    },
    [record, setGraph],
  );

  const addElementToNode = useCallback(
    (nodeId: string, type: ElementType) => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return false;
      if (!canAddElement(node.data.elements, type)) {
        showToast('A node can wait for only one customer input. Add a new node instead.');
        return false;
      }
      record();
      const element = createElement(type);
      const open = opensPanelOnAdd(type);
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          if (n.id === nodeId) {
            return { ...n, selected: open ? true : n.selected, data: { ...n.data, elements: placeElement(n.data.elements, element) } };
          }
          return open ? { ...n, selected: false } : n;
        }),
      }));
      if (open) setRightPanel({ kind: 'nodeDetails', nodeId, elementId: element.id });
      return true;
    },
    [record, setGraph],
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<ChatNodeData>) => {
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      }));
    },
    [setGraph],
  );

  const updateElement = useCallback(
    (nodeId: string, elementId: string, patch: Partial<NodeElement>) => {
      setGraph((g) => {
        const node = g.nodes.find((n) => n.id === nodeId);
        const before = node?.data.elements.find((el) => el.id === elementId);
        const removedButtons =
          before?.buttons && patch.buttons
            ? before.buttons.filter((b) => !patch.buttons!.some((nb) => nb.id === b.id)).map((b) => buttonHandleId(b.id))
            : [];
        const removedBranches =
          (before?.type === 'userInput' || before?.type === 'feedback') && 'condition' in patch && !patch.condition
            ? [inputBranchHandle(before.id, 'true'), inputBranchHandle(before.id, 'false')]
            : [];
        const drop = [...removedButtons, ...removedBranches];
        return {
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    elements: n.data.elements.map((el) => (el.id === elementId ? { ...el, ...patch } : el)),
                  },
                }
              : n,
          ),
          edges: drop.length
            ? g.edges.filter((e) => {
                if (e.source !== nodeId || !drop.includes(e.sourceHandle ?? '')) return true;
                return Boolean(e.data?.locked && removedBranches.includes(e.sourceHandle ?? ''));
              })
            : g.edges,
        };
      });
    },
    [setGraph],
  );

  const removeElement = useCallback(
    (nodeId: string, elementId: string) => {
      record();
      setGraph((g) => {
        const el = g.nodes.find((n) => n.id === nodeId)?.data.elements.find((e) => e.id === elementId);
        const handles = [
          ...(el?.buttons ?? []).map((b) => buttonHandleId(b.id)),
          ...(el?.type === 'userInput' || el?.type === 'feedback' ? [inputBranchHandle(el.id, 'true'), inputBranchHandle(el.id, 'false')] : []),
        ];
        return {
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, elements: n.data.elements.filter((e) => e.id !== elementId) } }
              : n,
          ),
          edges: g.edges.filter((e) => !(e.source === nodeId && handles.includes(e.sourceHandle ?? ''))),
        };
      });
      setRightPanel((p) =>
        p.kind === 'nodeDetails' && p.nodeId === nodeId && p.elementId === elementId ? { ...p, elementId: undefined } : p,
      );
    },
    [record, setGraph],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      record();
      setGraph((g) => ({
        nodes: g.nodes.filter((n) => n.id !== nodeId),
        edges: g.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        prompts: g.prompts.map((p) => (p.nodeId === nodeId ? { ...p, nodeId: '' } : p)),
      }));
      closePanelsForNode(nodeId);
      setTestActiveNodeId((id) => (id === nodeId ? null : id));
    },
    [record, setGraph, closePanelsForNode],
  );

  const requestDeleteNode = useCallback(
    (nodeId: string) => {
      void askDelete({ kind: 'node', count: 1 }).then((ok) => {
        if (ok) deleteNode(nodeId);
      });
    },
    [askDelete, deleteNode],
  );

  const requestDeleteElement = useCallback(
    (nodeId: string, elementId: string) => {
      void askDelete({ kind: 'element' }).then((ok) => {
        if (ok) removeElement(nodeId, elementId);
      });
    },
    [askDelete, removeElement],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const src = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!src) return;
      record();
      const copy: ChatFlowNode = {
        id: uid('node'),
        type: 'chat',
        position: { x: src.position.x + 40, y: src.position.y + 40 },
        selected: true,
        data: {
          ...src.data,
          name: src.data.name ? `${src.data.name} copy` : '',
          fallbackName: `Node#${nextNodeIndex(graphRef.current.nodes)}`,
          elements: src.data.elements.map(cloneElement),
          aiEnabled: false,
          promptId: undefined,
          isNew: false,
        },
      };
      setGraph((g) => ({ ...g, nodes: [...g.nodes.map((n) => ({ ...n, selected: false })), copy] }));
    },
    [record, setGraph],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      const edge = graphRef.current.edges.find((e) => e.id === edgeId);
      if (!edge || edge.data?.locked) return;
      record();
      setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== edgeId) }));
    },
    [record, setGraph],
  );

  const toggleEdgeLock = useCallback(
    (edgeId: string) => {
      record();
      setGraph((g) => ({
        ...g,
        edges: g.edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, locked: !e.data?.locked } } : e)),
      }));
    },
    [record, setGraph],
  );

  const setNodeAi = useCallback(
    (nodeId: string, enabled: boolean) => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const prompt = graphRef.current.prompts.find((p) => p.id === node.data.promptId && p.nodeId === nodeId);
      if (enabled && !prompt) {
        setRightPanel({
          kind: 'promptDetails',
          isNew: true,
          draft: { id: uid('prompt'), name: nodeLabel(node.data), keyword: '', alternatives: [''], nodeId },
        });
        return;
      }
      record();
      updateNodeData(nodeId, { aiEnabled: enabled });
      if (enabled && prompt) setRightPanel({ kind: 'promptDetails', isNew: false, draft: prompt });
    },
    [record, updateNodeData],
  );

  const savePrompt = useCallback(
    (prompt: AiPrompt) => {
      record();
      setGraph((g) => {
        const exists = g.prompts.some((p) => p.id === prompt.id);
        const prompts = exists ? g.prompts.map((p) => (p.id === prompt.id ? prompt : p)) : [...g.prompts, prompt];
        return {
          ...g,
          prompts,
          nodes: g.nodes.map((n) => {
            if (n.id === prompt.nodeId) return { ...n, data: { ...n.data, aiEnabled: true, promptId: prompt.id } };
            if (n.data.promptId === prompt.id) return { ...n, data: { ...n.data, aiEnabled: false, promptId: undefined } };
            return n;
          }),
        };
      });
    },
    [record, setGraph],
  );

  const deletePrompt = useCallback(
    (promptId: string) => {
      record();
      setGraph((g) => ({
        ...g,
        prompts: g.prompts.filter((p) => p.id !== promptId),
        nodes: g.nodes.map((n) =>
          n.data.promptId === promptId ? { ...n, data: { ...n.data, aiEnabled: false, promptId: undefined } } : n,
        ),
      }));
    },
    [record, setGraph],
  );

  const tidyLayout = useCallback(() => {
    const { nodes, edges } = graphRef.current;
    if (nodes.length < 2) return;
    const measured = nodes.map((n) => ({ ...n, measured: rf.getInternalNode(n.id)?.measured ?? n.measured }));
    const preset =
      scenario === 'welcome' ? queryWandTargets(nodes, edges) : scenario === 'messy' ? rearrangeWandTargets(nodes, edges) : null;
    const targets = preset ?? computeTidyLayout(measured, edges);
    const settled = nodes.every((n) => {
      const to = targets.get(n.id);
      return !!to && Math.abs(to.x - n.position.x) < 0.5 && Math.abs(to.y - n.position.y) < 0.5;
    });
    if (settled) return;
    record();
    const starts = new Map(nodes.map((n) => [n.id, n.position]));
    const duration = 450;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = easeInOut(Math.min(1, (now - t0) / duration));
      setGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          const from = starts.get(n.id);
          const to = targets.get(n.id);
          if (!from || !to) return n;
          return { ...n, position: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t } };
        }),
      }));
      if (t < 1) requestAnimationFrame(step);
      else rf.fitView({ ...FIT_VIEW, duration: 400 });
    };
    requestAnimationFrame(step);
  }, [record, setGraph, rf, scenario]);

  const openLibrary = useCallback((create = false) => {
    setArranging(false);
    setScreen('library');
    setLibraryCreate(create);
    setRightPanel({ kind: 'none' });
    setTestActiveNodeId(null);
  }, []);

  const startBot = useCallback(
    (title: string, graph: GraphState, options?: { arrange?: boolean }) => {
      restore(graph);
      setHistory({ past: [], future: [] });
      setScenario('blank');
      setBotTitle(title);
      setRightPanel({ kind: 'none' });
      setSearchQuery('');
      setTestActiveNodeId(null);
      setLibraryCreate(false);
      setArranging(Boolean(options?.arrange && graph.nodes.length > 1));
      setScreen('builder');
    },
    [restore, setHistory],
  );

  useEffect(() => {
    if (!arranging || screen !== 'builder') return;
    let frames = 0;
    let stable = 0;
    let previous = '';
    let raf = 0;
    const tick = () => {
      frames += 1;
      const { nodes, edges } = graphRef.current;
      const measured = nodes.map((n) => ({
        ...n,
        measured: rf.getInternalNode(n.id)?.measured ?? n.measured,
      }));
      const ready = measured.every((n) => (n.measured?.width ?? 0) > 0 && (n.measured?.height ?? 0) > 0);
      const signature = measured.map((n) => `${n.id}:${n.measured?.width}x${n.measured?.height}`).join('|');
      stable = ready && signature === previous ? stable + 1 : 0;
      previous = signature;
      if ((!ready || stable < 2) && frames < 45) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const targets = computeTidyLayout(measured, edges);
      restore({
        ...graphRef.current,
        nodes: graphRef.current.nodes.map((n) => {
          const position = targets.get(n.id);
          return position ? { ...n, position } : n;
        }),
      });
      setHistory({ past: [], future: [] });
      setArranging(false);
      requestAnimationFrame(() => rf.fitView({ ...FIT_VIEW, duration: 300 }));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arranging, screen, restore, rf, setHistory]);

  const loadScenario = useCallback(
    (id: ScenarioId) => {
      if (id === 'blank') {
        openLibrary();
        return;
      }
      const next = scenarioGraph(id);
      restore(next);
      setHistory({ past: [], future: [] });
      setScenario(id);
      setBotTitle('Whatsapp welcome bot');
      setRightPanel({ kind: 'none' });
      setSearchQuery('');
      setTestActiveNodeId(null);
      setLibraryCreate(false);
      setScreen('builder');
      if (id === 'welcome') setLeftPanel((panel) => ({ ...panel, expanded: true }));
      setArranging(false);
      requestAnimationFrame(() => {
        if (next.nodes.length) rf.fitView({ ...FIT_VIEW, duration: 300 });
        else rf.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
      });
    },
    [openLibrary, rf, restore, setHistory],
  );

  const restartScenario = useCallback(() => {
    if (screen === 'library') {
      setLibraryCreate(false);
      setLibraryKey((k) => k + 1);
      return;
    }
    if (scenario !== 'blank') {
      loadScenario(scenario);
      return;
    }
    restore(scenarioGraph('blank'));
    setHistory({ past: [], future: [] });
    setRightPanel({ kind: 'none' });
    setSearchQuery('');
    setTestActiveNodeId(null);
    setScreen('builder');
  }, [loadScenario, restore, scenario, screen, setHistory]);

  const addTemplate = useCallback((tpl: GraphState, title: string) => {
    if (!tpl.nodes.length) return;
    const { nodes } = graphRef.current;
    const left = nodes.length
      ? Math.max(...nodes.map((n) => n.position.x + (n.measured?.width ?? 260))) + 120
      : 0;
    const top = nodes.length ? Math.min(...nodes.map((n) => n.position.y)) : 0;
    const minX = Math.min(...tpl.nodes.map((n) => n.position.x));
    const minY = Math.min(...tpl.nodes.map((n) => n.position.y));
    const offsetIndex = nextNodeIndex(nodes) - 1;
    const added = tpl.nodes.map((n, i) => ({
      ...n,
      position: { x: n.position.x - minX + left, y: n.position.y - minY + top },
      data: { ...n.data, fallbackName: `Node#${offsetIndex + i + 1}` },
    }));
    record();
    setGraph((g) => ({ ...g, nodes: [...g.nodes, ...added], edges: [...g.edges, ...tpl.edges] }));
    showToast(`“${title}” template added`);
    requestAnimationFrame(() => rf.fitView({ ...FIT_VIEW, duration: 400 }));
  }, [record, setGraph, rf]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const internal = rf.getInternalNode(nodeId);
      setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => ({ ...n, selected: n.id === nodeId })) }));
      if (!internal) return;
      const { x, y } = internal.internals.positionAbsolute;
      const w = internal.measured.width ?? 260;
      const h = internal.measured.height ?? 140;
      rf.setCenter(x + w / 2, y + h / 2, { zoom: Math.max(rf.getZoom(), 0.8), duration: 400 });
    },
    [rf, setGraph],
  );

  const openNodeDetails = useCallback(
    (nodeId: string, elementId?: string) => {
      setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => ({ ...n, selected: n.id === nodeId })) }));
      setRightPanel({ kind: 'nodeDetails', nodeId, elementId });
    },
    [setGraph],
  );

  const openTest = useCallback((startNodeId?: string) => {
    setRightPanel((p) => ({
      kind: 'test',
      startNodeId,
      mode: p.kind === 'test' ? p.mode : 'full',
      runId: Date.now(),
    }));
  }, []);

  const value = useMemo<BuilderContextValue>(
    () => ({
      ...graph,
      onNodesChange,
      onEdgesChange,
      beforeDelete,
      record,
      undo,
      redo,
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
      addNodeWithElement,
      addEmptyNodeAndConnect,
      addElementToNode,
      updateNodeData,
      updateElement,
      removeElement,
      deleteNode,
      requestDeleteElement,
      requestDeleteNode,
      deleteConfirm,
      resolveDeleteConfirm,
      duplicateNode,
      connect,
      deleteEdge,
      toggleEdgeLock,
      setNodeAi,
      savePrompt,
      deletePrompt,
      tidyLayout,
      loadScenario,
      restartScenario,
      addTemplate,
      scenario,
      screen,
      botTitle,
      libraryCreate,
      libraryKey,
      setLibraryCreate,
      openLibrary,
      startBot,
      arranging,
      rightPanel,
      setRightPanel,
      openNodeDetails,
      openTest,
      focusNode,
      searchQuery,
      setSearchQuery,
      testActiveNodeId,
      setTestActiveNodeId,
      dragElement,
      setDragElement,
      dropTarget,
      setDropTarget,
      leftPanel,
      setLeftPanel,
      toast,
      showToast,
    }),
    [
      graph,
      onNodesChange,
      onEdgesChange,
      beforeDelete,
      record,
      undo,
      redo,
      historyVersion,
      addNodeWithElement,
      addEmptyNodeAndConnect,
      addElementToNode,
      updateNodeData,
      updateElement,
      removeElement,
      deleteNode,
      requestDeleteElement,
      requestDeleteNode,
      deleteConfirm,
      resolveDeleteConfirm,
      duplicateNode,
      connect,
      deleteEdge,
      toggleEdgeLock,
      setNodeAi,
      savePrompt,
      deletePrompt,
      tidyLayout,
      loadScenario,
      restartScenario,
      addTemplate,
      scenario,
      screen,
      botTitle,
      libraryCreate,
      libraryKey,
      setLibraryCreate,
      openLibrary,
      startBot,
      arranging,
      rightPanel,
      openNodeDetails,
      openTest,
      focusNode,
      searchQuery,
      testActiveNodeId,
      dragElement,
      dropTarget,
      leftPanel,
      toast,
    ],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}
