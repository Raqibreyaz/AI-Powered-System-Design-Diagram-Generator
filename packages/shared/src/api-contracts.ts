/**
 * API contract schemas — request and response shapes for all REST endpoints.
 * Used by the backend for request validation and by the frontend for type-safe
 * fetch calls.
 */

import { z } from "zod";
import { DiagramTypeSchema, NormalisedDiagramDSLSchema } from "./diagram-dsl.schema.js";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const DemoLoginRequestSchema = z.object({
  email: z.string().email(),
});

export const DemoLoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
  }),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({ diagrams: z.number(), files: z.number() }).optional(),
});

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
});

// ─── Generation ───────────────────────────────────────────────────────────────

export const GenerationComplexity = z.enum(["simple", "medium", "detailed"]);

export const GenerateFromPromptRequestSchema = z.object({
  projectId: z.string().optional(),
  prompt: z.string().min(10).max(4000),
  diagramType: DiagramTypeSchema,
  complexity: GenerationComplexity.default("medium"),
});

export const GenerateFromFilesRequestSchema = z.object({
  projectId: z.string(),
  fileIds: z.array(z.string()).min(1).max(20),
  prompt: z.string().max(2000).optional(),
  diagramType: DiagramTypeSchema.default("architecture"),
});

export const RegenerateSelectionRequestSchema = z.object({
  selectedNodeIds: z.array(z.string()).min(1),
  selectedEdgeIds: z.array(z.string()).default([]),
  prompt: z.string().min(5).max(2000),
});

// ─── Diagram CRUD ─────────────────────────────────────────────────────────────

export const PatchDiagramRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  /** Full normalised DSL + flow state after user edits */
  dslJson: NormalisedDiagramDSLSchema.optional(),
  /** Opaque React Flow viewport state */
  viewportJson: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export const DiagramSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  diagramType: DiagramTypeSchema,
  dslJson: NormalisedDiagramDSLSchema,
  viewportJson: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .nullable(),
  currentVersion: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Diagram Generation Response ─────────────────────────────────────────────

export const GenerateDiagramResponseSchema = z.object({
  diagram: DiagramSchema,
  jobId: z.string(),
  /** Items the AI was uncertain about */
  unresolvedItems: z
    .array(
      z.object({
        description: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
});

// ─── Versioning ───────────────────────────────────────────────────────────────

export const DiagramVersionSchema = z.object({
  id: z.string(),
  diagramId: z.string(),
  versionNumber: z.number().int(),
  changeNote: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const DiagramVersionListResponseSchema = z.object({
  versions: z.array(DiagramVersionSchema),
});

export const RestoreVersionRequestSchema = z.object({
  versionId: z.string(),
});

// ─── Export ───────────────────────────────────────────────────────────────────

export const ExportFormat = z.enum(["json", "png", "svg"]);

export const ExportRequestSchema = z.object({
  format: ExportFormat,
  /** Required for PNG/SVG — the rendered SVG string from the frontend */
  svgContent: z.string().optional(),
});

// ─── File Upload (parsed response) ───────────────────────────────────────────

export const UploadedFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string().datetime(),
});

// ─── Error ────────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});

// ─── Layout ───────────────────────────────────────────────────────────────────

export const LayoutDiagramRequestSchema = z.object({
  dslJson: NormalisedDiagramDSLSchema,
  options: z
    .object({
      direction: z.enum(["RIGHT", "DOWN", "LEFT", "UP"]).optional(),
      spacing: z.enum(["compact", "balanced", "spacious"]).optional(),
    })
    .optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type DemoLoginRequest = z.infer<typeof DemoLoginRequestSchema>;
export type DemoLoginResponse = z.infer<typeof DemoLoginResponseSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type GenerateFromPromptRequest = z.infer<typeof GenerateFromPromptRequestSchema>;
export type GenerateFromFilesRequest = z.infer<typeof GenerateFromFilesRequestSchema>;
export type RegenerateSelectionRequest = z.infer<typeof RegenerateSelectionRequestSchema>;
export type PatchDiagramRequest = z.infer<typeof PatchDiagramRequestSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type GenerateDiagramResponse = z.infer<typeof GenerateDiagramResponseSchema>;
export type DiagramVersion = z.infer<typeof DiagramVersionSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type UploadedFile = z.infer<typeof UploadedFileSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type LayoutDiagramRequest = z.infer<typeof LayoutDiagramRequestSchema>;

