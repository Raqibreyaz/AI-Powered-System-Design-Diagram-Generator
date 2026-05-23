 /**
 * File upload routes — POST /api/projects/:id/files
 *
 * Accepts multipart file uploads, validates type/size, saves to disk,
 * and runs the appropriate parser to build a parsedGraph for the file.
 */

import type { FastifyInstance } from "fastify";
import { createWriteStream } from "fs";
import { mkdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { pipeline } from "stream/promises";
import { z } from "zod";
import { config } from "../config.js";
import { Project, UploadedFile } from "../db/models.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";
import { buildProjectGraph } from "../parsers/project-graph.js";
import { generateId } from "../utils/id.js";
import { logger } from "../utils/logger.js";

/** Read file content from a storage path (exported for use by diagram routes) */
export async function readFileContent(storagePath: string): Promise<string> {
  return readFile(storagePath, "utf-8");
}

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/projects/:id/files — upload one or more files
  app.post(
    "/:id/files",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id: projectId } = z.object({ id: z.string() }).parse(request.params);

      // Verify the project belongs to the user
      const project = await Project.findOne({ _id: projectId, userId: req.userId });
      if (!project) {
        throw new AppError("Project not found", ErrorCodes.NOT_FOUND, 404);
      }

      // Ensure upload directory exists
      const uploadDir = join(config.UPLOAD_DIR, projectId);
      await mkdir(uploadDir, { recursive: true });

      const uploadedFiles: Array<{
        id: string;
        name: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: Date;
      }> = [];

      const parts = request.parts();

      for await (const part of parts) {
        if (part.type !== "file") continue;

        const originalName = basename(part.filename);
        const ext = extname(originalName).toLowerCase();

        // Validate extension
        if (!config.ALLOWED_EXTENSIONS.includes(ext) && !isDockerfile(originalName)) {
          logger.warn({ file: originalName, ext }, "rejected upload: unsupported extension");
          throw new AppError(
            `File type "${ext}" is not allowed. Allowed: ${config.ALLOWED_EXTENSIONS.join(", ")}`,
            ErrorCodes.UNSUPPORTED_FILE,
            415
          );
        }

        const fileId = generateId("file");
        const storageName = `${fileId}${ext || ".txt"}`;
        const storagePath = join(uploadDir, storageName);

        // Stream file to disk
        let sizeBytes = 0;
        const chunks: Buffer[] = [];

        // Buffer the file to check size before writing
        for await (const chunk of part.file) {
          sizeBytes += chunk.length;
          if (sizeBytes > config.MAX_UPLOAD_SIZE) {
            throw new AppError(
              `File too large. Max size is ${Math.round(config.MAX_UPLOAD_SIZE / 1024 / 1024)} MB`,
              ErrorCodes.FILE_TOO_LARGE,
              413
            );
          }
          chunks.push(chunk);
        }

        const content = Buffer.concat(chunks).toString("utf-8");

        // Write to disk
        await mkdir(join(uploadDir), { recursive: true });
        const ws = createWriteStream(storagePath);
        ws.write(content);
        ws.end();

        // Try to parse the file and store the result
        let parsedGraph: object | null = null;
        try {
          const graph = buildProjectGraph([{ name: originalName, content }]);
          parsedGraph = graph as unknown as object;
        } catch (err) {
          logger.warn({ file: originalName, err }, "could not parse file (stored anyway)");
        }

        // Persist to DB
        const dbFile = await UploadedFile.create({
          _id: fileId,
          projectId,
          name: originalName,
          mimeType: part.mimetype || "application/octet-stream",
          sizeBytes,
          storagePath,
          parsedGraph: parsedGraph as any,
        });

        uploadedFiles.push({
          id: dbFile.id,
          name: dbFile.name,
          mimeType: dbFile.mimeType,
          sizeBytes: dbFile.sizeBytes,
          createdAt: dbFile.createdAt,
        });
      }

      if (uploadedFiles.length === 0) {
        throw new AppError("No valid files were uploaded", ErrorCodes.VALIDATION, 400);
      }

      return reply.status(201).send({ files: uploadedFiles });
    }
  );

  // GET /api/projects/:id/files — list files for a project
  app.get(
    "/:id/files",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const req = request as AuthenticatedRequest;
      const { id: projectId } = z.object({ id: z.string() }).parse(request.params);

      const project = await Project.findOne({ _id: projectId, userId: req.userId });
      if (!project) throw new AppError("Project not found", ErrorCodes.NOT_FOUND, 404);

      const files = await UploadedFile.find({ projectId })
        .sort({ createdAt: -1 })
        .select("name mimeType sizeBytes createdAt");

      return reply.send({ files: files.map((f) => f.toJSON()) });
    }
  );
}

function isDockerfile(filename: string): boolean {
  return /dockerfile/i.test(filename);
}
