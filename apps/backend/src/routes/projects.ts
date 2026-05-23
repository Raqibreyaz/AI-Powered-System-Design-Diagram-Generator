import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Project, Diagram, UploadedFile, DiagramVersion, GenerationJob, EvidenceReference } from "../db/models.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";
import { CreateProjectRequestSchema } from "@diagram-forge/shared";

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/projects — create a new project
  app.post(
    "/",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const body = CreateProjectRequestSchema.parse(request.body);

      const project = await Project.create({
        userId: req.userId,
        name: body.name,
        description: body.description ?? null,
      });

      return reply.status(201).send({
        project: {
          ...project.toJSON(),
          _count: { diagrams: 0, files: 0 },
        },
      });
    }
  );

  // GET /api/projects — list user's projects
  app.get(
    "/",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const projects = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 });

      const projectsWithCount = await Promise.all(
        projects.map(async (project) => {
          const diagramsCount = await Diagram.countDocuments({ projectId: project.id });
          const filesCount = await UploadedFile.countDocuments({ projectId: project.id });
          return {
            ...project.toJSON(),
            _count: { diagrams: diagramsCount, files: filesCount },
          };
        })
      );

      return reply.send({ projects: projectsWithCount });
    }
  );

  // GET /api/projects/:id — get a specific project
  app.get(
    "/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const project = await Project.findOne({ _id: id, userId: req.userId });
      if (!project) {
        throw new AppError("Project not found", ErrorCodes.NOT_FOUND, 404);
      }

      const diagrams = await Diagram.find({ projectId: id })
        .select("title diagramType updatedAt")
        .sort({ updatedAt: -1 });

      const files = await UploadedFile.find({ projectId: id })
        .select("name mimeType sizeBytes createdAt");

      const projectJson = {
        ...project.toJSON(),
        diagrams: diagrams.map((d) => d.toJSON()),
        files: files.map((f) => f.toJSON()),
        _count: { diagrams: diagrams.length, files: files.length },
      };

      return reply.send({ project: projectJson });
    }
  );

  // DELETE /api/projects/:id
  app.delete(
    "/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const project = await Project.findOne({ _id: id, userId: req.userId });
      if (!project) {
        throw new AppError("Project not found", ErrorCodes.NOT_FOUND, 404);
      }

      // Cascade delete diagrams, files, versions, jobs, evidence refs associated with this project
      const diagrams = await Diagram.find({ projectId: id }).select("_id");
      const diagramIds = diagrams.map((d) => d._id);

      await DiagramVersion.deleteMany({ diagramId: { $in: diagramIds } });
      await GenerationJob.deleteMany({ diagramId: { $in: diagramIds } });
      await EvidenceReference.deleteMany({ diagramId: { $in: diagramIds } });
      await Diagram.deleteMany({ projectId: id });
      await UploadedFile.deleteMany({ projectId: id });
      await Project.deleteOne({ _id: id });

      return reply.status(204).send();
    }
  );
}
