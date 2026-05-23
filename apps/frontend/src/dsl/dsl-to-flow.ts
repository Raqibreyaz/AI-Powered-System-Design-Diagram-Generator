/**
 * DSL → React Flow converter.
 *
 * Takes a NormalisedDiagramDSL (with positions) and converts it into the
 * React Flow nodes and edges format. This is the only place in the frontend
 * where DSL is transformed into canvas state.
 *
 * Design rule: the frontend NEVER constructs DSL from scratch. It only
 * reads DSL from the backend. Edits made on the canvas are serialised
 * back to DSL format before saving.
 */

import type { Node, Edge } from "@xyflow/react";
import type { NormalisedDiagramDSL, PositionedDSLNode, DSLEdge } from "@diagram-forge/shared";

// Custom data attached to React Flow nodes
export type FlowNodeData = {
  label: string;
  nodeType: string;
  technology?: string;
  description?: string;
  confidence: number;
  color: string;
  icon: string;
  sourceRefs: NormalisedDiagramDSL["nodes"][number]["sourceRefs"];
  metadata?: Record<string, unknown>;
  groupId?: string;
  [key: string]: unknown;
};

// Custom data attached to React Flow edges
export type FlowEdgeData = {
  label?: string;
  protocol?: string;
  direction: string;
  confidence: number;
  sourceRefs: DSLEdge["sourceRefs"];
  [key: string]: unknown;
};

export function dslToFlowNodes(dsl: NormalisedDiagramDSL): Node<FlowNodeData>[] {
  const DEFAULT_NODE_WIDTH = 160;
  const DEFAULT_NODE_HEIGHT = 60;
  const GROUP_PADDING = 40;

  // Build group membership map
  const nodeToGroup = new Map<string, string>();
  for (const group of dsl.groups) {
    for (const childId of group.children) {
      nodeToGroup.set(childId, group.id);
    }
  }

  // Calculate bounding box for each group
  const groupPositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const group of dsl.groups) {
    const children = dsl.nodes.filter((n) => group.children.includes(n.id));
    if (children.length === 0) {
      groupPositions.set(group.id, { x: 0, y: 0, width: 200, height: 150 });
      continue;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      const cx = child.position.x;
      const cy = child.position.y;
      const cw = child.dimensions?.width ?? DEFAULT_NODE_WIDTH;
      const ch = child.dimensions?.height ?? DEFAULT_NODE_HEIGHT;

      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;
      if (cx + cw > maxX) maxX = cx + cw;
      if (cy + ch > maxY) maxY = cy + ch;
    }

    const x = minX - GROUP_PADDING;
    const y = minY - GROUP_PADDING;
    const width = (maxX - minX) + 2 * GROUP_PADDING;
    const height = (maxY - minY) + 2 * GROUP_PADDING;

    groupPositions.set(group.id, { x, y, width, height });
  }

  const nodes: Node<FlowNodeData>[] = [];

  // Add group nodes first (parent nodes in React Flow)
  for (const group of dsl.groups) {
    const pos = groupPositions.get(group.id) ?? { x: 0, y: 0, width: 200, height: 150 };
    nodes.push({
      id: group.id,
      type: "group",
      position: { x: pos.x, y: pos.y },
      data: {
        label: group.label,
        nodeType: "group",
        confidence: 1,
        color: group.style?.color ?? "#2d3548",
        icon: "layers",
        sourceRefs: [],
      },
      style: {
        width: pos.width,
        height: pos.height,
        background: "rgba(45, 53, 72, 0.3)",
        border: `1px ${group.style?.borderStyle ?? "dashed"} #3d4a5f`,
        borderRadius: "8px",
      },
    });
  }

  // Add DSL nodes
  for (const node of dsl.nodes) {
    const meta = (node.metadata ?? {}) as Record<string, unknown>;
    const color = (meta["_color"] as string | undefined) ?? "#6b7280";
    const icon = (meta["_icon"] as string | undefined) ?? "box";
    const groupId = nodeToGroup.get(node.id);

    let nodePosition = node.position;
    if (groupId) {
      const gPos = groupPositions.get(groupId);
      if (gPos) {
        nodePosition = {
          x: node.position.x - gPos.x,
          y: node.position.y - gPos.y,
        };
      }
    }

    const flowNode: Node<FlowNodeData> = {
      id: node.id,
      type: getDiagramNodeType(dsl.diagramType),
      position: nodePosition,
      parentId: groupId,
      extent: groupId ? "parent" : undefined,
      data: {
        label: node.label,
        nodeType: node.type,
        technology: node.technology,
        description: node.description,
        confidence: node.confidence,
        color,
        icon,
        sourceRefs: node.sourceRefs,
        metadata: node.metadata,
        groupId,
      },
      width: node.dimensions?.width ?? DEFAULT_NODE_WIDTH,
      height: node.dimensions?.height ?? DEFAULT_NODE_HEIGHT,
    };

    nodes.push(flowNode);
  }

  return nodes;
}

export function dslToFlowEdges(dsl: NormalisedDiagramDSL): Edge<FlowEdgeData>[] {
  return dsl.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "labeled",
    animated: edge.protocol === "event" || edge.protocol === "AMQP",
    markerEnd: {
      type: "arrowclosed" as const,
      color: "#3d4a5f",
    },
    data: {
      label: edge.label,
      protocol: edge.protocol,
      direction: edge.direction,
      confidence: edge.confidence,
      sourceRefs: edge.sourceRefs,
    },
    style: {
      stroke: edge.confidence < 0.7 ? "#6b7280" : "#3d4a5f",
      strokeDasharray: edge.confidence < 0.7 ? "5 5" : undefined,
    },
  }));
}

/** Choose the React Flow node type based on diagram type */
function getDiagramNodeType(diagramType: string): string {
  switch (diagramType) {
    case "sequence":
      return "sequenceNode";
    case "flowchart":
      return "flowNode";
    default:
      return "archNode";
  }
}

/**
 * Convert React Flow nodes back to DSL node format (for saving edits).
 * Only updates label and position — other fields are preserved from original DSL.
 */
export function flowNodesToDSLPatch(
  nodes: Node<FlowNodeData>[],
  originalDsl: NormalisedDiagramDSL
): NormalisedDiagramDSL {
  const parentPositions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (n.type === "group") {
      parentPositions.set(n.id, n.position);
    }
  }

  const positionMap = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (n.type !== "group") {
      if (n.parentId) {
        const parentPos = parentPositions.get(n.parentId) ?? { x: 0, y: 0 };
        positionMap.set(n.id, {
          x: n.position.x + parentPos.x,
          y: n.position.y + parentPos.y,
        });
      } else {
        positionMap.set(n.id, n.position);
      }
    }
  }

  return {
    ...originalDsl,
    nodes: originalDsl.nodes.map((node) => ({
      ...node,
      label: nodes.find((n) => n.id === node.id)?.data.label ?? node.label,
      position: positionMap.get(node.id) ?? node.position,
    })),
  };
}
