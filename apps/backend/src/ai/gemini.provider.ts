/**
 * Google Gemini AI provider.
 *
 * Uses the @google/generative-ai SDK. The system prompt is injected as a
 * system instruction and the model is configured to output JSON only.
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { config } from "../config.js";
import type {
  AIProvider,
  AIProviderResult,
  GenerateFromPromptInput,
  GenerateFromProjectGraphInput,
  RefineSelectionInput,
} from "./provider.interface.js";
import {
  DIAGRAM_SYSTEM_PROMPT,
  buildProjectGraphMessage,
  buildPromptMessage,
  buildRefineSelectionMessage,
} from "./prompts.js";
import { AppError, ErrorCodes } from "../middleware/error-handler.js";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;

  private readonly client: GoogleGenerativeAI;

  constructor() {
    if (!config.GEMINI_API_KEY) {
      throw new Error("GeminiProvider requires GEMINI_API_KEY to be set");
    }
    this.client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = config.GEMINI_MODEL;
  }

  async generateFromPrompt(input: GenerateFromPromptInput): Promise<AIProviderResult> {
    const userMessage = buildPromptMessage(input.prompt, input.diagramType, input.complexity);
    return this.generate(userMessage);
  }

  async generateFromProjectGraph(
    input: GenerateFromProjectGraphInput
  ): Promise<AIProviderResult> {
    const userMessage = buildProjectGraphMessage(
      input.projectGraph,
      input.diagramType,
      input.prompt
    );
    return this.generate(userMessage);
  }

  async refineSelection(input: RefineSelectionInput): Promise<AIProviderResult> {
    const userMessage = buildRefineSelectionMessage(
      input.currentDsl,
      input.selectedNodeIds,
      input.selectedEdgeIds,
      input.prompt
    );
    return this.generate(userMessage);
  }

  private async generate(userMessage: string): Promise<AIProviderResult> {
    try {
      const genModel = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: DIAGRAM_SYSTEM_PROMPT,
        generationConfig: {
          // Force JSON output mode — Gemini will return only valid JSON
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature for deterministic, structured output
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      const result = await genModel.generateContent(userMessage);
      const response = result.response;

      const rawJson = response.text();

      const usage = response.usageMetadata;

      return {
        rawJson,
        providerName: this.name,
        modelName: this.model,
        usage: usage
          ? {
              promptTokens: usage.promptTokenCount,
              completionTokens: usage.candidatesTokenCount,
              totalTokens: usage.totalTokenCount,
            }
          : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Gemini API error";
      throw new AppError(`Gemini API error: ${message}`, ErrorCodes.AI_ERROR, 502);
    }
  }
}
