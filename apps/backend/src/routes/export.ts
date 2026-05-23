/**
 * Export route — POST /api/diagrams/:id/export
 * Supports JSON export server-side. PNG/SVG export is handled client-side
 * (the frontend renders the canvas and sends the SVG string if needed).
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Diagram } from "../db/models.js";
import { authenticate } from "../middleware/auth.js";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";
import { ExportRequestSchema } from "@diagram-forge/shared";

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/:id/export",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const body = ExportRequestSchema.parse(request.body);

      const diagram = await Diagram.findById(id);
      if (!diagram) throw new AppError("Diagram not found", ErrorCodes.NOT_FOUND, 404);

      if (body.format === "json") {
        const filename = `${diagram.title.replace(/[^a-z0-9]/gi, "_")}.diagram-forge.json`;
        return reply
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .header("Content-Type", "application/json")
          .send(diagram.dslJson);
      }

      if (body.format === "svg" && body.svgContent) {
        const filename = `${diagram.title.replace(/[^a-z0-9]/gi, "_")}.svg`;
        return reply
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .header("Content-Type", "image/svg+xml")
          .send(body.svgContent);
      }

      throw new AppError(
        "PNG/SVG export requires svgContent from the frontend renderer",
        ErrorCodes.VALIDATION,
        400
      );
    }
  );
}
