/**
 * ELK Auto-layout — converts a validated DSL into a positioned DSL.
 *
 * Runs elk.js in the Node.js process (server-side). Returns a copy of the DSL
 * with `position` and `dimensions` fields added to every node.
 *
 * ELK algorithm selection by diagram type:
 * - architecture: "layered" (left-to-right hierarchy)
 * - flowchart:    "layered" (top-to-bottom)
 * - sequence:     "box" with manual ordering (ELK doesn't support sequence natively)
 */

import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import type { DiagramDSLOutput, NormalisedDiagramDSL, PositionedDSLNode } from "@diagram-forge/shared";
import { logger } from "../utils/logger.js";

const elk = new (ELK as any)();

// Default node dimensions (ELK needs them to compute positions)
const DEFAULT_NODE_WIDTH = 160;
const DEFAULT_NODE_HEIGHT = 60;
const GROUP_PADDING = 40;

export interface ELKLayoutOptions {
  direction?: "RIGHT" | "DOWN" | "LEFT" | "UP";
  spacing?: "compact" | "balanced" | "spacious";
}

export async function applyELKLayout(
  dsl: DiagramDSLOutput,
  options?: ELKLayoutOptions
): Promise<NormalisedDiagramDSL> {
  const algorithm = "layered";
  
  let direction = dsl.diagramType === "sequence" ? "DOWN" : "RIGHT";
  if (options?.direction) {
    direction = options.direction;
  }

  let nodeSpacing = "60";
  let layerSpacing = "80";
  if (options?.spacing) {
    if (options.spacing === "compact") {
      nodeSpacing = "40";
      layerSpacing = "60";
    } else if (options.spacing === "spacious") {
      nodeSpacing = "100";
      layerSpacing = "130";
    }
  }


  // Build ELK node map — groups become parent nodes in ELK
  const groupChildSet = new Set(dsl.groups.flatMap((g) => g.children));
  const groupById = new Map(dsl.groups.map((g) => [g.id, g]));

  // Top-level nodes: those not inside any group
  const topLevelNodes: ElkNode[] = [];

  // Group nodes
  for (const group of dsl.groups) {
    const groupNode: ElkNode = {
      id: group.id,
      width: DEFAULT_NODE_WIDTH * 2,
      height: DEFAULT_NODE_HEIGHT * 2,
      layoutOptions: {
        "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      },
      children: dsl.nodes
        .filter((n) => group.children.includes(n.id))
        .map((n) => ({
          id: n.id,
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        })),
    };
    topLevelNodes.push(groupNode);
  }

  // Non-grouped nodes
  for (const node of dsl.nodes) {
    if (!groupChildSet.has(node.id)) {
      topLevelNodes.push({
        id: node.id,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      });
    }
  }

  // ELK edges — use the group node ID as endpoint if node is in a group
  const elkEdges: ElkExtendedEdge[] = dsl.edges.map((edge) => {
    // Find which group (if any) contains from/to
    const fromGroup = dsl.groups.find((g) => g.children.includes(edge.from));
    const toGroup = dsl.groups.find((g) => g.children.includes(edge.to));

    return {
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
      // ELK needs container info for cross-hierarchy edges
      ...(fromGroup ? { sourcePort: `${fromGroup.id}.${edge.from}` } : {}),
      ...(toGroup ? { targetPort: `${toGroup.id}.${edge.to}` } : {}),
    };
  });

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": algorithm,
      "elk.direction": direction,
      "elk.spacing.nodeNode": nodeSpacing,
      "elk.layered.spacing.nodeNodeBetweenLayers": layerSpacing,
      "elk.spacing.componentComponent": nodeSpacing,
      "elk.layered.unnecessaryBendpoints": "true",
    },
    children: topLevelNodes,
    edges: elkEdges,
  };

  let laid: ElkNode;
  try {
    laid = await elk.layout(graph);
  } catch (err) {
    logger.warn({ err }, "ELK layout failed — falling back to grid layout");
    return fallbackGridLayout(dsl);
  }

  // Build a flat map of node id → position from the laid-out graph
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  collectPositions(laid, positions);

  const positionedNodes: PositionedDSLNode[] = dsl.nodes.map((node) => {
    const pos = positions.get(node.id);
    return {
      ...node,
      position: { x: pos?.x ?? 0, y: pos?.y ?? 0 },
      dimensions: {
        width: pos?.width ?? DEFAULT_NODE_WIDTH,
        height: pos?.height ?? DEFAULT_NODE_HEIGHT,
      },
    };
  });

  return {
    ...dsl,
    nodes: positionedNodes,
  } as NormalisedDiagramDSL;
}

/** Recursively collect node positions from ELK output (handles nested groups) */
function collectPositions(
  node: ElkNode,
  positions: Map<string, { x: number; y: number; width: number; height: number }>,
  offsetX = 0,
  offsetY = 0
): void {
  const x = (node.x ?? 0) + offsetX;
  const y = (node.y ?? 0) + offsetY;

  if (node.id !== "root") {
    positions.set(node.id, {
      x,
      y,
      width: node.width ?? DEFAULT_NODE_WIDTH,
      height: node.height ?? DEFAULT_NODE_HEIGHT,
    });
  }

  for (const child of node.children ?? []) {
    collectPositions(child, positions, x, y);
  }
}

/** Simple fallback grid layout when ELK fails */
function fallbackGridLayout(dsl: DiagramDSLOutput): NormalisedDiagramDSL {
  const COLS = 4;
  const GAP_X = 220;
  const GAP_Y = 140;

  const positionedNodes: PositionedDSLNode[] = dsl.nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % COLS) * GAP_X + 50,
      y: Math.floor(i / COLS) * GAP_Y + 50,
    },
    dimensions: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
  }));

  return { ...dsl, nodes: positionedNodes } as NormalisedDiagramDSL;
}
