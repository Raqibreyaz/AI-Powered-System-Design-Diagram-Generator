/**
 * Diagram routes:
 * POST /api/diagrams/generate-from-prompt
 * POST /api/diagrams/generate-from-files
 * POST /api/diagrams/:id/regenerate-selection
 * PATCH /api/diagrams/:id
 * GET  /api/diagrams/:id
 * GET  /api/diagrams/:id/versions
 * POST /api/diagrams/:id/restore-version
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Diagram, DiagramVersion, GenerationJob, UploadedFile } from "../db/models.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";
import {
  GenerateFromPromptRequestSchema,
  GenerateFromFilesRequestSchema,
  RegenerateSelectionRequestSchema,
  PatchDiagramRequestSchema,
  RestoreVersionRequestSchema,
} from "@diagram-forge/shared";
import {
  generateFromPrompt,
  generateFromProjectGraph,
  refineSelection,
} from "../ai/ai.service.js";
import { buildProjectGraph, serialiseProjectGraph } from "../parsers/project-graph.js";
import { logger } from "../utils/logger.js";

export async function diagramRoutes(app: FastifyInstance): Promise<void> {
  // ─── POST /generate-from-prompt ──────────────────────────────────────────

  app.post(
    "/generate-from-prompt",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const body = GenerateFromPromptRequestSchema.parse(request.body);

      // Create a generation job record for traceability
      const job = await GenerationJob.create({
        status: "RUNNING",
        inputType: "prompt",
        inputPayload: body as object,
      });

      let result;
      try {
        result = await generateFromPrompt({
          prompt: body.prompt,
          diagramType: body.diagramType,
          complexity: body.complexity,
        });
      } catch (err) {
        await GenerationJob.findByIdAndUpdate(job.id, {
          status: "FAILED",
          errorMessage: String(err),
          completedAt: new Date(),
        });
        throw err;
      }

      // Persist the diagram
      const diagram = await Diagram.create({
        projectId: body.projectId ?? null,
        title: result.dsl.title,
        diagramType: body.diagramType,
        dslJson: result.dsl as object,
        currentVersion: 1,
      });

      // Save initial version snapshot
      await DiagramVersion.create({
        diagramId: diagram.id,
        versionNumber: 1,
        dslJson: result.dsl as object,
        changeNote: "Initial generation",
      });

      await GenerationJob.findByIdAndUpdate(job.id, {
        diagramId: diagram.id,
        status: "COMPLETED",
        provider: result.providerName,
        completedAt: new Date(),
      });

      logger.info(
        { diagramId: diagram.id, provider: result.providerName },
        "diagram generated from prompt"
      );

      return reply.status(201).send({
        diagram: serialiseDiagram(diagram, result.dsl),
        jobId: job.id,
        unresolvedItems: result.dsl.unresolvedItems,
      });
    }
  );

  // ─── POST /generate-from-files ───────────────────────────────────────────

  app.post(
    "/generate-from-files",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const body = GenerateFromFilesRequestSchema.parse(request.body);

      // Load files from DB
      const files = await UploadedFile.find({
        _id: { $in: body.fileIds },
        projectId: body.projectId,
      });

      if (files.length === 0) {
        throw new AppError("No matching files found", ErrorCodes.NOT_FOUND, 404);
      }

      // Read file content from filesystem
      const { readFileContent } = await import("../routes/files.js");
      const fileInputs = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          content: await readFileContent(f.storagePath),
        }))
      );

      const graph = buildProjectGraph(fileInputs);
      const serialised = serialiseProjectGraph(graph);

      const job = await GenerationJob.create({
        status: "RUNNING",
        inputType: "files",
        inputPayload: { projectId: body.projectId, fileIds: body.fileIds } as object,
      });

      let result;
      try {
        result = await generateFromProjectGraph({
          projectGraph: serialised,
          prompt: body.prompt,
          diagramType: body.diagramType,
        });
      } catch (err) {
        await GenerationJob.findByIdAndUpdate(job.id, {
          status: "FAILED",
          errorMessage: String(err),
          completedAt: new Date(),
        });
        throw err;
      }

      const diagram = await Diagram.create({
        projectId: body.projectId,
        title: result.dsl.title,
        diagramType: body.diagramType,
        dslJson: result.dsl as object,
        currentVersion: 1,
      });

      await DiagramVersion.create({
        diagramId: diagram.id,
        versionNumber: 1,
        dslJson: result.dsl as object,
        changeNote: "Generated from files",
      });

      await GenerationJob.findByIdAndUpdate(job.id, {
        diagramId: diagram.id,
        status: "COMPLETED",
        provider: result.providerName,
        completedAt: new Date(),
      });

      return reply.status(201).send({
        diagram: serialiseDiagram(diagram, result.dsl),
        jobId: job.id,
        unresolvedItems: result.dsl.unresolvedItems,
      });
    }
  );

  // ─── POST /:id/regenerate-selection ──────────────────────────────────────

  app.post(
    "/:id/regenerate-selection",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const body = RegenerateSelectionRequestSchema.parse(request.body);

      const diagram = await Diagram.findById(id);
      if (!diagram) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

      const result = await refineSelection({
        currentDsl: JSON.stringify(diagram.dslJson),
        selectedNodeIds: body.selectedNodeIds,
        selectedEdgeIds: body.selectedEdgeIds,
        prompt: body.prompt,
      });

      const newVersion = diagram.currentVersion + 1;

      const updated = await Diagram.findByIdAndUpdate(
        id,
        {
          dslJson: result.dsl as object,
          currentVersion: newVersion,
          title: result.dsl.title,
        },
        { new: true }
      );
      if (!updated) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

      await DiagramVersion.create({
        diagramId: id,
        versionNumber: newVersion,
        dslJson: result.dsl as object,
        changeNote: `Refined selection: ${body.prompt.slice(0, 80)}`,
      });

      return reply.send({ diagram: serialiseDiagram(updated, result.dsl) });
    }
  );

  // ─── GET / — list all user's diagrams ───────────────────────────────────

  app.get("/", { preHandler: [authenticate] }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const query = z.object({
      projectId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      skip: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);

    const filter: Record<string, unknown> = {};
    if (query.projectId) {
      filter["projectId"] = query.projectId;
    }

    const diagrams = await Diagram.find(filter)
      .sort({ updatedAt: -1 })
      .skip(query.skip)
      .limit(query.limit)
      .select("id title diagramType currentVersion projectId createdAt updatedAt");

    const total = await Diagram.countDocuments(filter);

    return reply.send({
      diagrams: diagrams.map((d) => d.toJSON()),
      total,
    });
  });

  // ─── GET /:id ─────────────────────────────────────────────────────────────

  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const diagram = await Diagram.findById(id);
    if (!diagram) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);
    return reply.send({ diagram: diagram.toJSON() });
  });

  // ─── DELETE /:id ──────────────────────────────────────────────────────────

  app.delete("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const diagram = await Diagram.findByIdAndDelete(id);
    if (!diagram) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);
    // Clean up versions too
    await DiagramVersion.deleteMany({ diagramId: id });
    return reply.status(204).send();
  });

  // ─── PATCH /:id ───────────────────────────────────────────────────────────

  app.patch("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = PatchDiagramRequestSchema.parse(request.body);

    const existing = await Diagram.findById(id);
    if (!existing) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

    const newVersion = existing.currentVersion + 1;

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData["title"] = body.title;
    if (body.dslJson !== undefined) {
      updateData["dslJson"] = body.dslJson as object;
      updateData["currentVersion"] = newVersion;
    }
    if (body.viewportJson !== undefined) updateData["viewportJson"] = body.viewportJson;

    const updated = await Diagram.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

    // Save version if DSL changed
    if (body.dslJson !== undefined) {
      await DiagramVersion.create({
        diagramId: id,
        versionNumber: newVersion,
        dslJson: body.dslJson as object,
        viewportJson: body.viewportJson as any,
        changeNote: "Manual edit",
      });
    }

    return reply.send({ diagram: updated.toJSON() });
  });

  // ─── GET /:id/versions ────────────────────────────────────────────────────

  app.get("/:id/versions", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const versions = await DiagramVersion.find({ diagramId: id })
      .sort({ versionNumber: -1 })
      .select("diagramId versionNumber changeNote createdAt");

    return reply.send({ versions: versions.map((v) => v.toJSON()) });
  });

  // ─── POST /:id/restore-version ────────────────────────────────────────────

  app.post("/:id/restore-version", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { versionId } = RestoreVersionRequestSchema.parse(request.body);

    const version = await DiagramVersion.findOne({ _id: versionId, diagramId: id });
    if (!version) throw new AppError("Version not found", ErrorCodes.NOT_FOUND, 404);

    const existing = await Diagram.findById(id);
    if (!existing) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

    const newVersion = existing.currentVersion + 1;

    const restored = await Diagram.findByIdAndUpdate(
      id,
      {
        dslJson: version.dslJson,
        viewportJson: version.viewportJson,
        currentVersion: newVersion,
      },
      { new: true }
    );
    if (!restored) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

    await DiagramVersion.create({
      diagramId: id,
      versionNumber: newVersion,
      dslJson: version.dslJson,
      viewportJson: version.viewportJson,
      changeNote: `Restored from v${version.versionNumber}`,
    });

    return reply.send({ diagram: restored.toJSON() });
  });
}

/** Convert diagram record to API response shape */
function serialiseDiagram(diagram: any, dsl: unknown) {
  return {
    id: diagram.id || diagram._id,
    projectId: diagram.projectId,
    title: diagram.title,
    diagramType: diagram.diagramType,
    dslJson: dsl,
    viewportJson: diagram.viewportJson ?? null,
    currentVersion: diagram.currentVersion,
    createdAt: typeof diagram.createdAt === "string" ? diagram.createdAt : diagram.createdAt.toISOString(),
    updatedAt: typeof diagram.updatedAt === "string" ? diagram.updatedAt : diagram.updatedAt.toISOString(),
  };
}
