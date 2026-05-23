/**
 * OpenAI provider — uses the `openai` SDK with JSON mode enabled.
 */

import OpenAI from "openai";
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

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;

  private readonly client: OpenAI;

  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error("OpenAIProvider requires OPENAI_API_KEY to be set");
    }
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    this.model = config.OPENAI_MODEL;
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
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" }, // JSON mode
        temperature: 0.2,
        max_tokens: 8192,
        messages: [
          { role: "system", content: DIAGRAM_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });

      const choice = completion.choices[0];
      if (!choice?.message.content) {
        throw new AppError("OpenAI returned empty response", ErrorCodes.AI_ERROR, 502);
      }

      return {
        rawJson: choice.message.content,
        providerName: this.name,
        modelName: this.model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : "Unknown OpenAI error";
      throw new AppError(`OpenAI API error: ${message}`, ErrorCodes.AI_ERROR, 502);
    }
  }
}
