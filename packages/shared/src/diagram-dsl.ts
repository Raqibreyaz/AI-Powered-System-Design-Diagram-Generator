/**
 * Diagram DSL — The canonical intermediate representation for all diagrams.
 *
 * The AI is ONLY allowed to produce this structure. It is never allowed to emit
 * raw React Flow state. The pipeline is:
 *
 *   AI output → DSL JSON → Zod validation → Normalizer → ELK layout → React Flow
 *
 * This strict separation means the frontend is decoupled from AI output format,
 * and all layout/rendering concerns live in clearly defined layers.
 */

// ─── Primitive types ──────────────────────────────────────────────────────────

export type DiagramType = "architecture" | "flowchart" | "sequence";

export type NodeType =
  | "service"
  | "database"
  | "queue"
  | "storage"
  | "gateway"
  | "cdn"
  | "cache"
  | "client"
  | "process"
  | "actor"
  | "decision"
  | "external"
  | "monitor"
  | "loadbalancer"
  | "generic";

export type EdgeDirection = "forward" | "backward" | "bidirectional";

export type ConfidenceLevel = number; // 0.0 – 1.0

// ─── Source References ────────────────────────────────────────────────────────

/**
 * Traces a node or edge back to the source that created it.
 * Can reference a prompt fragment, an uploaded file + line range, or an
 * inferred relationship.
 */
export interface SourceRef {
  /** "prompt" | "file" | "inferred" */
  type: "prompt" | "file" | "inferred";
  /** For file refs: original filename */
  fileName?: string;
  /** For file refs: line numbers (1-indexed, inclusive) */
  lineStart?: number;
  lineEnd?: number;
  /** Verbatim snippet from the source */
  snippet?: string;
  /** Human-readable note about why this was inferred */
  inferenceNote?: string;
}

// ─── DSL Node ─────────────────────────────────────────────────────────────────

export interface DSLNode {
  /** Stable, unique identifier within this diagram */
  id: string;
  type: NodeType;
  label: string;
  /** Longer description shown in the inspector panel */
  description?: string;
  /** Technology stack (e.g. "PostgreSQL 15", "NGINX", "Redis") */
  technology?: string;
  /** Arbitrary additional metadata (ports, env vars, etc.) */
  metadata?: Record<string, unknown>;
  /** AI confidence that this node belongs in the diagram */
  confidence: ConfidenceLevel;
  /** References to source material that justify this node */
  sourceRefs: SourceRef[];
}

// ─── DSL Edge ─────────────────────────────────────────────────────────────────

export interface DSLEdge {
  /** Stable, unique identifier within this diagram */
  id: string;
  /** ID of the source node */
  from: string;
  /** ID of the target node */
  to: string;
  /** Short label shown on the edge (e.g. "HTTPS", "reads from") */
  label?: string;
  /** Network/application protocol (e.g. "gRPC", "AMQP", "TCP") */
  protocol?: string;
  direction: EdgeDirection;
  metadata?: Record<string, unknown>;
  /** AI confidence that this relationship is correct */
  confidence: ConfidenceLevel;
  sourceRefs: SourceRef[];
}

// ─── DSL Group ────────────────────────────────────────────────────────────────

/**
 * Groups are rendered as container/swimlane boxes on the canvas.
 * They must only reference node IDs that exist in the DSL.
 */
export interface DSLGroup {
  id: string;
  label: string;
  /** Node IDs contained in this group */
  children: string[];
  style?: {
    color?: string;
    borderStyle?: "solid" | "dashed" | "dotted";
  };
}

// ─── DSL Annotation ───────────────────────────────────────────────────────────

export interface DSLAnnotation {
  id: string;
  text: string;
  /** The node or edge ID this annotation is anchored to */
  anchorRef: string;
}

// ─── Unresolved Items ─────────────────────────────────────────────────────────

/**
 * Items the AI was uncertain about. Displayed in the inspector with a warning
 * so the user can decide whether to add them manually.
 */
export interface UnresolvedItem {
  description: string;
  reason: string;
}

// ─── Root DSL ─────────────────────────────────────────────────────────────────

export interface DiagramDSL {
  /** Schema version — allows forward compatibility checks */
  schemaVersion: "1.0";
  diagramType: DiagramType;
  title: string;
  summary: string;
  /** Overall AI confidence score (0–1) */
  confidence: ConfidenceLevel;
  nodes: DSLNode[];
  edges: DSLEdge[];
  groups: DSLGroup[];
  annotations: DSLAnnotation[];
  /** Things the AI was uncertain about and did not include */
  unresolvedItems: UnresolvedItem[];
}

// ─── Normalised / Layout-enriched DSL ────────────────────────────────────────

/**
 * After the normalizer and layout engine run, nodes get x/y positions.
 * This extended type is stored in the database and sent to the frontend.
 */
export interface PositionedDSLNode extends DSLNode {
  position: { x: number; y: number };
  /** Width/height determined by the layout engine */
  dimensions?: { width: number; height: number };
}

export interface NormalisedDiagramDSL extends Omit<DiagramDSL, "nodes"> {
  nodes: PositionedDSLNode[];
}
