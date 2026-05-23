/**
 * AI Service — orchestrates provider selection, invocation, DSL validation,
 * normalisation, and layout.
 *
 * This is the single entry point for all AI-related diagram generation.
 * Route handlers call this service; they never touch providers directly.
 */

import type { AIProvider } from "./provider.interface.js";
import type {
  GenerateFromPromptInput,
  GenerateFromProjectGraphInput,
  RefineSelectionInput,
} from "./provider.interface.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { MockAIProvider } from "./mock.provider.js";
import { validateDSL } from "../dsl/validator.js";
import { normaliseDSL } from "../dsl/normalizer.js";
import { applyELKLayout } from "../dsl/layout.js";
import { resolveAIProvider } from "../config.js";
import { logger } from "../utils/logger.js";
import type { NormalisedDiagramDSL } from "@diagram-forge/shared";

export interface GenerationResult {
  dsl: NormalisedDiagramDSL;
  providerName: string;
  modelName: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

/** Lazily initialised provider singleton — created once per process */
let _provider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (_provider) return _provider;

  const providerName = resolveAIProvider();
  logger.info({ provider: providerName }, "initialising AI provider");

  switch (providerName) {
    case "gemini":
      _provider = new GeminiProvider();
      break;
    case "openai":
      _provider = new OpenAIProvider();
      break;
    default:
      _provider = new MockAIProvider();
  }

  return _provider;
}

/** Override the active provider (used in tests) */
export function setProvider(provider: AIProvider): void {
  _provider = provider;
}

/**
 * Full pipeline: prompt → AI → validate DSL → normalise → ELK layout → result
 */
export async function generateFromPrompt(
  input: GenerateFromPromptInput
): Promise<GenerationResult> {
  const provider = getProvider();

  logger.info(
    { provider: provider.name, diagramType: input.diagramType },
    "generating diagram from prompt"
  );

  const aiResult = await provider.generateFromPrompt(input);
  return processAIResult(aiResult);
}

export async function generateFromProjectGraph(
  input: GenerateFromProjectGraphInput
): Promise<GenerationResult> {
  const provider = getProvider();

  logger.info(
    { provider: provider.name, diagramType: input.diagramType },
    "generating diagram from project graph"
  );

  const aiResult = await provider.generateFromProjectGraph(input);
  return processAIResult(aiResult);
}

export async function refineSelection(input: RefineSelectionInput): Promise<GenerationResult> {
  const provider = getProvider();

  logger.info(
    { provider: provider.name, selectedNodes: input.selectedNodeIds.length },
    "refining diagram selection"
  );

  const aiResult = await provider.refineSelection(input);
  return processAIResult(aiResult);
}

/** Shared post-processing: parse → validate → normalise → layout */
async function processAIResult(aiResult: {
  rawJson: string;
  providerName: string;
  modelName: string;
  usage?: GenerationResult["usage"];
}): Promise<GenerationResult> {
  // 1. Parse raw JSON (catch malformed JSON before Zod)
  let parsed: unknown;
  try {
    parsed = JSON.parse(aiResult.rawJson);
  } catch {
    throw new Error(`AI returned invalid JSON: ${aiResult.rawJson.slice(0, 200)}`);
  }

  // 2. Validate against Zod DSL schema
  const validatedDSL = validateDSL(parsed);

  // 3. Normalise (dedup, merge, stable IDs, style defaults)
  const normalisedDSL = normaliseDSL(validatedDSL);

  // 4. Apply ELK auto-layout (server-side, returns positioned nodes)
  const layoutedDSL = await applyELKLayout(normalisedDSL);

  return {
    dsl: layoutedDSL,
    providerName: aiResult.providerName,
    modelName: aiResult.modelName,
    usage: aiResult.usage,
  };
}
