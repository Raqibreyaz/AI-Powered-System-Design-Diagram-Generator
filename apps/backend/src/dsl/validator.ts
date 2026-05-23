/**
 * DSL Validator — runs Zod schema validation on AI output.
 *
 * This is the first gate in the pipeline. If the AI returns malformed DSL,
 * we throw a structured error with detailed Zod issue information so we can
 * log it, surface it to the user, and improve prompts over time.
 */

import { DiagramDSLSchema } from "@diagram-forge/shared";
import type { DiagramDSLOutput } from "@diagram-forge/shared";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";
import { logger } from "../utils/logger.js";

export function validateDSL(raw: unknown): DiagramDSLOutput {
  const result = DiagramDSLSchema.safeParse(raw);

  if (!result.success) {
    const formatted = result.error.flatten();
    logger.warn({ validationErrors: formatted }, "DSL validation failed");

    throw new AppError(
      "AI returned a diagram that did not pass schema validation",
      ErrorCodes.DSL_VALIDATION,
      422,
      formatted
    );
  }

  return result.data;
}
