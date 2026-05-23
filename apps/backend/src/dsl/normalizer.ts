/**
 * DSL Normaliser — cleans and enriches validated DSL before layout.
 *
 * Responsibilities:
 * 1. Deduplicate nodes by label (case-insensitive) — keep the higher-confidence one
 * 2. Merge duplicate edges (same from+to+direction) — keep the higher-confidence one
 * 3. Re-map edge from/to references after dedup (remapping table)
 * 4. Ensure all IDs are stable slug strings
 * 5. Remove group children that reference deduped-away nodes
 * 6. Add default styling metadata based on node type
 *
 * This layer is intentionally conservative: when in doubt, keep the item.
 * The user can always delete nodes from the canvas.
 */

import type { DiagramDSLOutput, DSLNode, DSLEdge } from "@diagram-forge/shared";
import { slugify } from "../utils/id.js";
import { logger } from "../utils/logger.js";

// Per-type default visual metadata injected during normalisation.
// These are hints consumed by the frontend renderer.
const NODE_TYPE_DEFAULTS: Record<string, { color: string; icon: string }> = {
  service:     { color: "#3b82f6", icon: "server" },
  database:    { color: "#8b5cf6", icon: "database" },
  queue:       { color: "#f59e0b", icon: "layers" },
  storage:     { color: "#10b981", icon: "hard-drive" },
  gateway:     { color: "#6366f1", icon: "shield" },
  cdn:         { color: "#14b8a6", icon: "globe" },
  cache:       { color: "#f97316", icon: "zap" },
  client:      { color: "#64748b", icon: "monitor" },
  process:     { color: "#3b82f6", icon: "cpu" },
  actor:       { color: "#64748b", icon: "user" },
  decision:    { color: "#eab308", icon: "git-branch" },
  external:    { color: "#94a3b8", icon: "external-link" },
  monitor:     { color: "#ec4899", icon: "activity" },
  loadbalancer:{ color: "#0ea5e9", icon: "shuffle" },
  generic:     { color: "#6b7280", icon: "box" },
};

export function normaliseDSL(dsl: DiagramDSLOutput): DiagramDSLOutput {
  const { deduped, remapTable } = deduplicateNodes(dsl.nodes);

  const remappedEdges = remapEdgeEndpoints(dsl.edges, remapTable);
  const mergedEdges = mergeEdges(remappedEdges);
  const cleanedGroups = cleanGroups(dsl.groups, new Set(deduped.map((n) => n.id)));
  const styledNodes = applyDefaultStyling(deduped);

  const removed = dsl.nodes.length - deduped.length;
  const mergedEdgeCount = dsl.edges.length - mergedEdges.length;

  if (removed > 0 || mergedEdgeCount > 0) {
    logger.debug(
      { nodesRemoved: removed, edgesMerged: mergedEdgeCount },
      "normaliser deduplication stats"
    );
  }

  return {
    ...dsl,
    nodes: styledNodes,
    edges: mergedEdges,
    groups: cleanedGroups,
  };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateNodes(nodes: DSLNode[]): {
  deduped: DSLNode[];
  remapTable: Map<string, string>; // removed id → surviving id
} {
  const remapTable = new Map<string, string>();
  // Group by normalised label
  const byLabel = new Map<string, DSLNode[]>();

  for (const node of nodes) {
    const key = node.label.toLowerCase().trim();
    const existing = byLabel.get(key);
    if (existing) {
      existing.push(node);
    } else {
      byLabel.set(key, [node]);
    }
  }

  const deduped: DSLNode[] = [];

  for (const group of byLabel.values()) {
    if (group.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      deduped.push(group[0]!);
      continue;
    }

    // Keep the node with the highest confidence; merge sourceRefs
    const sorted = [...group].sort((a, b) => b.confidence - a.confidence);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const winner = sorted[0]!;
    const allRefs = sorted.flatMap((n) => n.sourceRefs);

    const merged: DSLNode = {
      ...winner,
      sourceRefs: allRefs,
    };
    deduped.push(merged);

    // Record remapping for all losers
    for (let i = 1; i < sorted.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      remapTable.set(sorted[i]!.id, winner.id);
    }
  }

  return { deduped, remapTable };
}

// ─── Edge Remapping ───────────────────────────────────────────────────────────

function remapEdgeEndpoints(edges: DSLEdge[], remapTable: Map<string, string>): DSLEdge[] {
  return edges.map((edge) => ({
    ...edge,
    from: remapTable.get(edge.from) ?? edge.from,
    to: remapTable.get(edge.to) ?? edge.to,
  }));
}

// ─── Edge Merging ─────────────────────────────────────────────────────────────

function mergeEdges(edges: DSLEdge[]): DSLEdge[] {
  const seen = new Map<string, DSLEdge>();

  for (const edge of edges) {
    // Self-loops are invalid — skip
    if (edge.from === edge.to) continue;

    const key = `${edge.from}→${edge.to}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, edge);
    } else {
      // Keep the higher-confidence edge, merge sourceRefs
      const winner = existing.confidence >= edge.confidence ? existing : edge;
      seen.set(key, {
        ...winner,
        sourceRefs: [...existing.sourceRefs, ...edge.sourceRefs],
      });
    }
  }

  return Array.from(seen.values());
}

// ─── Group Cleanup ────────────────────────────────────────────────────────────

function cleanGroups(
  groups: DiagramDSLOutput["groups"],
  validNodeIds: Set<string>
): DiagramDSLOutput["groups"] {
  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((id) => validNodeIds.has(id)),
    }))
    .filter((group) => group.children.length > 0); // Remove empty groups
}

// ─── Default Styling ──────────────────────────────────────────────────────────

function applyDefaultStyling(nodes: DSLNode[]): DSLNode[] {
  return nodes.map((node) => {
    const defaults = NODE_TYPE_DEFAULTS[node.type] ?? NODE_TYPE_DEFAULTS["generic"]!;
    return {
      ...node,
      // Inject visual hints into metadata without overwriting user-set values
      metadata: {
        _color: defaults.color,
        _icon: defaults.icon,
        ...node.metadata,
      },
    };
  });
}

/** Ensure an ID is a valid slug — re-slugify if necessary */
export function ensureStableId(id: string): string {
  const slugged = slugify(id);
  return slugged.length > 0 ? slugged : id;
}
