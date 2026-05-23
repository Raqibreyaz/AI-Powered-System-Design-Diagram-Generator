/**
 * Fastify server entry point.
 *
 * Plugin registration order matters:
 * 1. Core plugins (cors, jwt, multipart, rate-limit)
 * 2. Error handler
 * 3. Routes
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { logger } from "./utils/logger.js";

// Routes
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { fileRoutes } from "./routes/files.js";
import { diagramRoutes } from "./routes/diagrams.js";
import { exportRoutes } from "./routes/export.js";

async function buildServer() {
  const app = Fastify({
    logger: false, // We use pino directly
    trustProxy: true,
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_UPLOAD_SIZE,
      files: 20,
    },
  });

  await app.register(rateLimit, {
    global: false, // Route-level rate limiting
    max: config.RATE_LIMIT_API,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      error: "Too many requests",
      code: "RATE_LIMITED",
      retryAfter: context.after,
    }),
  });

  // ─── Error handler ────────────────────────────────────────────────────────

  app.setErrorHandler(errorHandler);

  // ─── Health check ─────────────────────────────────────────────────────────

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  }));

  // ─── API Routes ───────────────────────────────────────────────────────────

  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(projectRoutes, { prefix: "/api/projects" });

  // File routes are nested under projects: /api/projects/:id/files
  app.register(fileRoutes, { prefix: "/api/projects" });

  app.register(diagramRoutes, { prefix: "/api/diagrams" });
  app.register(exportRoutes, { prefix: "/api/diagrams" });

  return app;
}

async function main() {
  // Connect to MongoDB before starting the server
  try {
    await connectMongo();
  } catch (err) {
    logger.error(err, "database connection failed");
    process.exit(1);
  }

  const app = await buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    await app.close();
    await disconnectMongo();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    logger.info({ port: config.PORT }, "🚀 Diagram Forge backend started");
  } catch (err) {
    logger.error({ err }, "failed to start server");
    process.exit(1);
  }
}

void main();
