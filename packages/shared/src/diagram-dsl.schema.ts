/**
 * Zod schemas for the Diagram DSL.
 *
 * These are the authoritative runtime validators. Both the backend (to validate
 * AI output) and the frontend (to validate imported JSON) use these schemas.
 *
 * Design principle: schemas mirror the TypeScript types exactly. No silent
 * coercion — use `.strict()` where possible to catch unknown keys from AI.
 */

import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────

export const DiagramTypeSchema = z.enum(["architecture", "flowchart", "sequence"]);

export const NodeTypeSchema = z.enum([
  "service",
  "database",
  "queue",
  "storage",
  "gateway",
  "cdn",
  "cache",
  "client",
  "process",
  "actor",
  "decision",
  "external",
  "monitor",
  "loadbalancer",
  "generic",
]);

export const EdgeDirectionSchema = z.enum(["forward", "backward", "bidirectional"]);

/** Confidence must be a number between 0 and 1 (inclusive) */
export const ConfidenceLevelSchema = z.number().min(0).max(1);

// ─── Source Reference ─────────────────────────────────────────────────────────

export const SourceRefSchema = z
  .object({
    type: z.enum(["prompt", "file", "inferred"]),
    fileName: z.string().optional(),
    lineStart: z.number().int().positive().optional(),
    lineEnd: z.number().int().positive().optional(),
    snippet: z.string().max(500).optional(),
    inferenceNote: z.string().max(300).optional(),
  })
  .strict();

// ─── DSL Node ─────────────────────────────────────────────────────────────────

export const DSLNodeSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: NodeTypeSchema,
    label: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    technology: z.string().max(100).optional(),
    metadata: z.record(z.unknown()).optional(),
    confidence: ConfidenceLevelSchema,
    sourceRefs: z.array(SourceRefSchema).default([]),
  })
  .strict();

// ─── DSL Edge ─────────────────────────────────────────────────────────────────

export const DSLEdgeSchema = z
  .object({
    id: z.string().min(1).max(100),
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().max(80).optional(),
    protocol: z.string().max(50).optional(),
    direction: EdgeDirectionSchema,
    metadata: z.record(z.unknown()).optional(),
    confidence: ConfidenceLevelSchema,
    sourceRefs: z.array(SourceRefSchema).default([]),
  })
  .strict();

// ─── DSL Group ────────────────────────────────────────────────────────────────

export const DSLGroupSchema = z
  .object({
    id: z.string().min(1).max(100),
    label: z.string().min(1).max(100),
    children: z.array(z.string()).min(1),
    style: z
      .object({
        color: z.string().optional(),
        borderStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
      })
      .optional(),
  })
  .strict();

// ─── DSL Annotation ───────────────────────────────────────────────────────────

export const DSLAnnotationSchema = z
  .object({
    id: z.string().min(1).max(100),
    text: z.string().min(1).max(500),
    anchorRef: z.string().min(1),
  })
  .strict();

// ─── Unresolved Items ─────────────────────────────────────────────────────────

export const UnresolvedItemSchema = z
  .object({
    description: z.string().min(1).max(300),
    reason: z.string().min(1).max(300),
  })
  .strict();

/** The base object schema without cross-field validation (used for .omit/.extend) */
export const DiagramDSLBaseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  diagramType: DiagramTypeSchema,
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  confidence: ConfidenceLevelSchema,
  nodes: z.array(DSLNodeSchema).min(1).max(100),
  edges: z.array(DSLEdgeSchema).max(200),
  groups: z.array(DSLGroupSchema).default([]),
  annotations: z.array(DSLAnnotationSchema).default([]),
  unresolvedItems: z.array(UnresolvedItemSchema).default([]),
}).strict();

// ─── Root DiagramDSL ──────────────────────────────────────────────────────────

export const DiagramDSLSchema = DiagramDSLBaseSchema.superRefine((dsl, ctx) => {
  // Cross-field validation: all edge endpoints must reference existing nodes
    const nodeIds = new Set(dsl.nodes.map((n) => n.id));
    for (const edge of dsl.edges) {
      if (!nodeIds.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" references unknown source node "${edge.from}"`,
          path: ["edges"],
        });
      }
      if (!nodeIds.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" references unknown target node "${edge.to}"`,
          path: ["edges"],
        });
      }
    }
    // Cross-field validation: all group children must reference existing nodes
    for (const group of dsl.groups) {
      for (const childId of group.children) {
        if (!nodeIds.has(childId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Group "${group.id}" references unknown node "${childId}"`,
            path: ["groups"],
          });
        }
      }
    }
    // Cross-field validation: annotation anchors must exist
    for (const annotation of dsl.annotations) {
      const edgeIds = new Set(dsl.edges.map((e) => e.id));
      if (!nodeIds.has(annotation.anchorRef) && !edgeIds.has(annotation.anchorRef)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Annotation "${annotation.id}" references unknown anchor "${annotation.anchorRef}"`,
          path: ["annotations"],
        });
      }
    }
  });

// ─── Positioned extension (post-layout) ──────────────────────────────────────

export const PositionedDSLNodeSchema = DSLNodeSchema.extend({
  position: z.object({ x: z.number(), y: z.number() }),
  dimensions: z
    .object({ width: z.number().positive(), height: z.number().positive() })
    .optional(),
});

export const NormalisedDiagramDSLSchema = DiagramDSLBaseSchema.omit({ nodes: true }).extend({
  nodes: z.array(PositionedDSLNodeSchema).min(1).max(100),
});

// ─── Inferred types from schemas ─────────────────────────────────────────────

export type DiagramDSLInput = z.input<typeof DiagramDSLSchema>;
export type DiagramDSLOutput = z.output<typeof DiagramDSLSchema>;
export type NormalisedDiagramDSLOutput = z.output<typeof NormalisedDiagramDSLSchema>;
