/**
 * Mock AI provider — returns realistic canned DSL responses.
 * Used when no API keys are configured, and in tests.
 *
 * The mock always returns a valid, layout-ready DSL so the full pipeline
 * (validator → normalizer → ELK → React Flow) can be exercised without a key.
 */

import type {
  AIProvider,
  AIProviderResult,
  GenerateFromPromptInput,
  GenerateFromProjectGraphInput,
  RefineSelectionInput,
} from "./provider.interface.js";

const MOCK_ARCHITECTURE_DSL = JSON.stringify({
  schemaVersion: "1.0",
  diagramType: "architecture",
  title: "Scalable Web Application Architecture",
  summary:
    "A three-tier scalable web application with CDN, load balancer, API services, database, and caching layers.",
  confidence: 0.95,
  nodes: [
    {
      id: "client",
      type: "client",
      label: "Browser / Mobile",
      description: "End user clients accessing the application",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "scalable web application" }],
    },
    {
      id: "cdn",
      type: "cdn",
      label: "CDN",
      description: "Content Delivery Network for static assets",
      technology: "CloudFront",
      confidence: 0.9,
      sourceRefs: [{ type: "prompt", snippet: "CDN" }],
    },
    {
      id: "load_balancer",
      type: "loadbalancer",
      label: "Load Balancer",
      description: "Distributes incoming traffic across API instances",
      technology: "ALB",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "load balancer" }],
    },
    {
      id: "api_service",
      type: "service",
      label: "API Service",
      description: "Stateless REST API instances",
      technology: "Node.js / Fastify",
      confidence: 0.95,
      sourceRefs: [{ type: "prompt", snippet: "API" }],
    },
    {
      id: "cache",
      type: "cache",
      label: "Redis Cache",
      description: "In-memory cache for sessions and hot data",
      technology: "Redis 7",
      confidence: 0.9,
      sourceRefs: [{ type: "inferred", inferenceNote: "Common pattern for session management" }],
    },
    {
      id: "database",
      type: "database",
      label: "PostgreSQL",
      description: "Primary relational database",
      technology: "PostgreSQL 15",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "database" }],
    },
    {
      id: "object_store",
      type: "storage",
      label: "Object Storage",
      description: "Stores user uploads and static media",
      technology: "S3",
      confidence: 0.85,
      sourceRefs: [{ type: "inferred", inferenceNote: "Standard pattern for file uploads" }],
    },
  ],
  edges: [
    {
      id: "client_to_cdn",
      from: "client",
      to: "cdn",
      label: "HTTPS",
      protocol: "HTTPS",
      direction: "forward",
      confidence: 0.95,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "client_to_lb",
      from: "client",
      to: "load_balancer",
      label: "HTTPS",
      protocol: "HTTPS",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "lb_to_api",
      from: "load_balancer",
      to: "api_service",
      label: "HTTP",
      protocol: "HTTP",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "api_to_cache",
      from: "api_service",
      to: "cache",
      label: "reads/writes",
      protocol: "Redis",
      direction: "bidirectional",
      confidence: 0.9,
      sourceRefs: [{ type: "inferred" }],
    },
    {
      id: "api_to_db",
      from: "api_service",
      to: "database",
      label: "SQL",
      protocol: "PostgreSQL wire",
      direction: "bidirectional",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "api_to_store",
      from: "api_service",
      to: "object_store",
      label: "uploads",
      protocol: "S3 API",
      direction: "bidirectional",
      confidence: 0.85,
      sourceRefs: [{ type: "inferred" }],
    },
  ],
  groups: [
    {
      id: "backend_tier",
      label: "Backend Tier",
      children: ["api_service", "cache", "database", "object_store"],
    },
  ],
  annotations: [],
  unresolvedItems: [
    {
      description: "Message queue / async processing",
      reason: "Not specified in the prompt — consider adding if background jobs are needed",
    },
  ],
});

const MOCK_FLOWCHART_DSL = JSON.stringify({
  schemaVersion: "1.0",
  diagramType: "flowchart",
  title: "OAuth 2.0 Authorization Code Flow",
  summary: "Standard OAuth 2.0 Authorization Code flow with PKCE",
  confidence: 0.98,
  nodes: [
    {
      id: "user",
      type: "actor",
      label: "User",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "OAuth 2.0" }],
    },
    {
      id: "client_app",
      type: "client",
      label: "Client App",
      description: "The relying party / application",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "auth_server",
      type: "service",
      label: "Authorization Server",
      description: "Issues tokens after verifying consent",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "OAuth 2.0" }],
    },
    {
      id: "resource_server",
      type: "service",
      label: "Resource Server",
      description: "Protected API that accepts access tokens",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "consent_decision",
      type: "decision",
      label: "User Consents?",
      confidence: 1.0,
      sourceRefs: [{ type: "inferred", inferenceNote: "Standard OAuth consent step" }],
    },
  ],
  edges: [
    {
      id: "user_to_client",
      from: "user",
      to: "client_app",
      label: "initiates login",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "client_to_auth",
      from: "client_app",
      to: "auth_server",
      label: "authorization request + code_challenge",
      protocol: "HTTPS redirect",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "PKCE" }],
    },
    {
      id: "auth_to_consent",
      from: "auth_server",
      to: "consent_decision",
      label: "show consent screen",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "inferred" }],
    },
    {
      id: "consent_yes",
      from: "consent_decision",
      to: "client_app",
      label: "Yes → authorization code",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
    {
      id: "client_to_auth_token",
      from: "client_app",
      to: "auth_server",
      label: "code + code_verifier → tokens",
      protocol: "HTTPS POST",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt", snippet: "PKCE" }],
    },
    {
      id: "client_to_resource",
      from: "client_app",
      to: "resource_server",
      label: "Bearer access_token",
      protocol: "HTTPS",
      direction: "forward",
      confidence: 1.0,
      sourceRefs: [{ type: "prompt" }],
    },
  ],
  groups: [],
  annotations: [],
  unresolvedItems: [],
});

export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock-v1";

  async generateFromPrompt(input: GenerateFromPromptInput): Promise<AIProviderResult> {
    // Simulate a small async delay to mirror real API latency
    await delay(300);

    const raw =
      input.diagramType === "flowchart" ? MOCK_FLOWCHART_DSL : MOCK_ARCHITECTURE_DSL;

    return {
      rawJson: raw,
      providerName: this.name,
      modelName: this.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async generateFromProjectGraph(
    _input: GenerateFromProjectGraphInput
  ): Promise<AIProviderResult> {
    await delay(400);
    return {
      rawJson: MOCK_ARCHITECTURE_DSL,
      providerName: this.name,
      modelName: this.model,
    };
  }

  async refineSelection(_input: RefineSelectionInput): Promise<AIProviderResult> {
    await delay(250);
    return {
      rawJson: MOCK_ARCHITECTURE_DSL,
      providerName: this.name,
      modelName: this.model,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
