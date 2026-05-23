/**
 * Diagram store — manages the active diagram canvas state.
 * Holds the DSL, React Flow nodes/edges, selection state, and undo/redo history.
 */

import { create } from "zustand";
import { type Node, type Edge, type NodeChange, type EdgeChange, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { NormalisedDiagramDSL, UnresolvedItem } from "@diagram-forge/shared";
import { dslToFlowEdges, dslToFlowNodes, flowNodesToDSLPatch } from "../dsl/dsl-to-flow";
import type { FlowNodeData, FlowEdgeData } from "../dsl/dsl-to-flow";

const HISTORY_LIMIT = 50;

// Node type → display color map (mirrors Tailwind config)
const NODE_COLORS: Record<string, string> = {
  service: "#3b82f6", database: "#8b5cf6", queue: "#f59e0b",
  storage: "#10b981", gateway: "#6366f1", cdn: "#14b8a6",
  cache: "#f97316", client: "#64748b", loadbalancer: "#0ea5e9",
  monitor: "#ec4899", decision: "#eab308", external: "#94a3b8", generic: "#6b7280",
};

const NODE_ICONS: Record<string, string> = {
  service: "server", database: "database", queue: "shuffle",
  storage: "hard-drive", gateway: "layers", cdn: "globe",
  cache: "zap", client: "user", loadbalancer: "activity",
  monitor: "monitor", decision: "git-branch", external: "external-link", generic: "box",
};

function generateNodeId(): string {
  return `node_${Math.random().toString(36).slice(2, 9)}`;
}

export interface DiagramState {
  // Active diagram metadata
  diagramId: string | null;
  diagramTitle: string;
  diagramVersion: number;
  diagramType: string;

  // Current DSL (source of truth)
  dsl: NormalisedDiagramDSL | null;

  // React Flow state
  nodes: Node<FlowNodeData>[];
  edges: Edge<FlowEdgeData>[];
  viewport: { x: number; y: number; zoom: number };

  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Generation state
  isGenerating: boolean;
  generationError: string | null;
  unresolvedItems: UnresolvedItem[];

  // Undo/redo
  history: NormalisedDiagramDSL[];
  historyIndex: number;

  // Actions
  loadDiagram: (diagramId: string, dsl: NormalisedDiagramDSL, meta: { title: string; version: number; diagramType: string }) => void;
  setDSL: (dsl: NormalisedDiagramDSL, pushHistory?: boolean) => void;
  onNodesChange: (changes: NodeChange<Node<FlowNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge<FlowEdgeData>>[]) => void;
  onSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  addNode: (label: string, nodeType: string, position: { x: number; y: number }, technology?: string) => void;
  deleteSelected: () => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setGenerating: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;
  setUnresolvedItems: (items: UnresolvedItem[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagramId: null,
  diagramTitle: "Untitled Diagram",
  diagramVersion: 1,
  diagramType: "architecture",
  dsl: null,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  isGenerating: false,
  generationError: null,
  unresolvedItems: [],
  history: [],
  historyIndex: -1,

  loadDiagram: (diagramId, dsl, meta) => {
    set({
      diagramId,
      diagramTitle: meta.title,
      diagramVersion: meta.version,
      diagramType: meta.diagramType,
      dsl,
      nodes: dslToFlowNodes(dsl),
      edges: dslToFlowEdges(dsl),
      history: [dsl],
      historyIndex: 0,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isGenerating: false,
    });
  },

  setDSL: (dsl, pushHistory = true) => {
    set((state) => {
      const newHistory = pushHistory
        ? [...state.history.slice(0, state.historyIndex + 1), dsl].slice(-HISTORY_LIMIT)
        : state.history;
      const newIndex = pushHistory
        ? Math.min(state.historyIndex + 1, HISTORY_LIMIT - 1)
        : state.historyIndex;

      return {
        dsl,
        nodes: dslToFlowNodes(dsl),
        edges: dslToFlowEdges(dsl),
        history: newHistory,
        historyIndex: newIndex,
      };
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      const nextNodes = applyNodeChanges<Node<FlowNodeData>>(changes, state.nodes);
      let nextDsl = state.dsl;
      if (nextDsl) {
        const positionChanged = changes.some((c) => c.type === "position");
        if (positionChanged) {
          nextDsl = flowNodesToDSLPatch(nextNodes, nextDsl);
        }
      }
      return {
        nodes: nextNodes,
        dsl: nextDsl,
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges<Edge<FlowEdgeData>>(changes, state.edges) }));
  },

  onSelectionChange: ({ nodes, edges }) => {
    set({
      selectedNodeIds: nodes.map((n) => n.id),
      selectedEdgeIds: edges.map((e) => e.id),
    });
  },

  updateNodeLabel: (nodeId, label) => {
    set((state) => {
      if (!state.dsl) return {};
      const updatedNodes = state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
      );
      const updatedDsl = flowNodesToDSLPatch(updatedNodes, state.dsl);
      return {
        nodes: updatedNodes,
        dsl: updatedDsl,
      };
    });
  },

  addNode: (label, nodeType, position, technology) => {
    set((state) => {
      const id = generateNodeId();
      const color = NODE_COLORS[nodeType] ?? "#6b7280";
      const icon = NODE_ICONS[nodeType] ?? "box";

      // Add to React Flow nodes
      const newFlowNode: Node<FlowNodeData> = {
        id,
        type: "archNode",
        position,
        data: {
          label,
          nodeType,
          technology,
          confidence: 1.0,
          color,
          icon,
          sourceRefs: [],
          metadata: { _color: color, _icon: icon },
        },
        width: 160,
        height: 60,
      };

      // Add to DSL
      if (!state.dsl) {
        // No existing diagram — create a minimal one
        const newDsl: NormalisedDiagramDSL = {
          schemaVersion: "1.0",
          diagramType: "architecture",
          title: "My Diagram",
          summary: "Manually created diagram",
          confidence: 1.0,
          nodes: [{
            id,
            type: nodeType as any,
            label,
            technology,
            confidence: 1.0,
            position,
            dimensions: { width: 160, height: 60 },
            sourceRefs: [],
            metadata: { _color: color, _icon: icon },
          }],
          edges: [],
          groups: [],
          annotations: [],
          unresolvedItems: [],
        };

        const newHistory = [...state.history.slice(0, state.historyIndex + 1), newDsl].slice(-HISTORY_LIMIT);
        return {
          dsl: newDsl,
          nodes: [newFlowNode],
          edges: [],
          history: newHistory,
          historyIndex: newHistory.length - 1,
          diagramTitle: "My Diagram",
        };
      }

      const updatedDsl: NormalisedDiagramDSL = {
        ...state.dsl,
        nodes: [
          ...state.dsl.nodes,
          {
            id,
            type: nodeType as any,
            label,
            technology,
            confidence: 1.0,
            position,
            dimensions: { width: 160, height: 60 },
            sourceRefs: [],
            metadata: { _color: color, _icon: icon },
          },
        ],
      };

      const newHistory = [...state.history.slice(0, state.historyIndex + 1), updatedDsl].slice(-HISTORY_LIMIT);
      return {
        dsl: updatedDsl,
        nodes: [...state.nodes, newFlowNode],
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  deleteSelected: () => {
    set((state) => {
      if (!state.dsl) return {};
      const { selectedNodeIds, selectedEdgeIds } = state;
      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return {};

      const nodeIdSet = new Set(selectedNodeIds);
      const edgeIdSet = new Set(selectedEdgeIds);

      const updatedDsl: NormalisedDiagramDSL = {
        ...state.dsl,
        nodes: state.dsl.nodes.filter((n) => !nodeIdSet.has(n.id)),
        edges: state.dsl.edges.filter(
          (e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.from) && !nodeIdSet.has(e.to)
        ),
        groups: state.dsl.groups
          .map((g) => ({ ...g, children: g.children.filter((c) => !nodeIdSet.has(c)) }))
          .filter((g) => g.children.length > 0),
      };

      const newHistory = [...state.history.slice(0, state.historyIndex + 1), updatedDsl].slice(-HISTORY_LIMIT);

      return {
        dsl: updatedDsl,
        nodes: state.nodes.filter((n) => !nodeIdSet.has(n.id)),
        edges: state.edges.filter(
          (e) => !edgeIdSet.has(e.id) && !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
        ),
        selectedNodeIds: [],
        selectedEdgeIds: [],
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  setViewport: (viewport) => set({ viewport }),

  setGenerating: (isGenerating) => set({ isGenerating, generationError: null }),

  setGenerationError: (generationError) => set({ generationError, isGenerating: false }),

  setUnresolvedItems: (unresolvedItems) => set({ unresolvedItems }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const dsl = history[newIndex];
    if (!dsl) return;
    set({
      historyIndex: newIndex,
      dsl,
      nodes: dslToFlowNodes(dsl),
      edges: dslToFlowEdges(dsl),
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const dsl = history[newIndex];
    if (!dsl) return;
    set({
      historyIndex: newIndex,
      dsl,
      nodes: dslToFlowNodes(dsl),
      edges: dslToFlowEdges(dsl),
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  reset: () =>
    set({
      diagramId: null,
      diagramTitle: "Untitled Diagram",
      dsl: null,
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      history: [],
      historyIndex: -1,
      isGenerating: false,
      generationError: null,
      unresolvedItems: [],
    }),
}));
