/**
 * Application configuration — parsed and validated from environment variables.
 * Fail-fast on startup if required values are missing or malformed.
 */

import "dotenv/config";
import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .default("development-secret-change-me-in-production"),

  // AI providers — optional; provider selection is automatic
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024), // 10 MB
  ALLOWED_EXTENSIONS: z
    .string()
    .default(".yaml,.yml,.json,.env,.dockerfile,.txt")
    .transform((s) => s.split(",").map((e) => e.trim().toLowerCase())),

  RATE_LIMIT_GENERATION: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_API: z.coerce.number().int().positive().default(120),
});

function parseConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const config = parseConfig();

/** Determine which AI provider to use based on available keys */
export type AIProviderName = "gemini" | "openai" | "mock";

export function resolveAIProvider(): AIProviderName {
  if (config.GEMINI_API_KEY) return "gemini";
  if (config.OPENAI_API_KEY) return "openai";
  return "mock";
}

export type Config = typeof config;
