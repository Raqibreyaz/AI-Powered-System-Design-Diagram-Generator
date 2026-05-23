/**
 * AI Provider interface — defines the contract that every provider must implement.
 *
 * Providers are stateless objects. They receive a structured prompt payload and
 * return raw DSL JSON (as a string). Validation and normalisation happen in the
 * AI service layer, NOT inside providers.
 */

export interface GenerateFromPromptInput {
  prompt: string;
  diagramType: "architecture" | "flowchart" | "sequence";
  complexity: "simple" | "medium" | "detailed";
}

export interface GenerateFromProjectGraphInput {
  /** Serialised intermediate project graph */
  projectGraph: string;
  /** Optional user-provided hint/refinement */
  prompt?: string;
  diagramType: "architecture" | "flowchart" | "sequence";
}

export interface RefineSelectionInput {
  /** Current DSL JSON string (full diagram) */
  currentDsl: string;
  /** IDs of the nodes the user wants to refine */
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  /** User's refinement instruction */
  prompt: string;
}

export interface AIProviderResult {
  /** Raw DSL JSON string — must be validated before use */
  rawJson: string;
  /** Provider-reported token counts, if available */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Which provider and model produced this */
  providerName: string;
  modelName: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  generateFromPrompt(input: GenerateFromPromptInput): Promise<AIProviderResult>;
  generateFromProjectGraph(input: GenerateFromProjectGraphInput): Promise<AIProviderResult>;
  refineSelection(input: RefineSelectionInput): Promise<AIProviderResult>;
}
