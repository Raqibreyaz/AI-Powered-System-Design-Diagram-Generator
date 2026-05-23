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
