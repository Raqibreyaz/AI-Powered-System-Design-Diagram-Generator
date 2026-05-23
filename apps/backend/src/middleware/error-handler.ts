import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

/** Structured error codes used across the API */
export const ErrorCodes = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  AI_ERROR: "AI_ERROR",
  DSL_VALIDATION: "DSL_VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL_ERROR",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE: "UNSUPPORTED_FILE_TYPE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Domain error that carries a structured code */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Global Fastify error handler — converts all errors to consistent JSON */
export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  // AppError — our domain errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  // ZodError — schema validation failures (shouldn't reach here if we validate
  // before calling handlers, but kept as a safety net)
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: "Request validation failed",
      code: ErrorCodes.VALIDATION,
      details: error.flatten(),
    });
    return;
  }

  // Fastify built-in errors (e.g. 404, method not allowed)
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    reply.status(fastifyError.statusCode).send({
      error: fastifyError.message,
      code: ErrorCodes.INTERNAL,
    });
    return;
  }

  // Unexpected errors — log and return generic 500
  logger.error({ err: error }, "unhandled error");
  reply.status(500).send({
    error: "An unexpected error occurred",
    code: ErrorCodes.INTERNAL,
  });
}
