# Diagram Forge — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite + Tailwind)                              │
│                                                                 │
│  LandingPage → WorkspacePage (React Flow canvas)                │
│                                                                 │
│  ┌──────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │LeftPanel │  │  DiagramCanvas       │  │  RightPanel      │  │
│  │          │  │  (React Flow)        │  │  Inspector       │  │
│  │PromptBox │  │  Custom nodes:       │  │  Evidence        │  │
│  │FileZone  │  │  · ArchNode          │  │  UnresolvedItems │  │
│  └──────────┘  │  · FlowNode          │  └──────────────────┘  │
│                │  · SequenceNode      │                         │
│                │  Custom edges:       │                         │
│                │  · LabeledEdge       │                         │
│                └──────────────────────┘                         │
│                                                                 │
│  Zustand stores: diagram.store · project.store · ui.store       │
│  Services: api.ts · diagram.service · project.service           │
│  DSL → Flow converter: dsl-to-flow.ts                           │
└─────────────────────────────────────────────────────────────────┘
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Fastify + TypeScript + Node.js 20)                    │
│                                                                 │
│  Routes:                                                        │
│  /api/auth/*        → authRoutes                                │
│  /api/projects/*    → projectRoutes, fileRoutes                 │
│  /api/diagrams/*    → diagramRoutes, exportRoutes               │
│                                                                 │
│  AI Service Layer:                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ai.service.ts (orchestrator)                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │  │
│  │  │GeminiProvider│  │OpenAIProvider│  │MockAIProvider  │   │  │
│  │  └─────────────┘  └─────────────┘  └────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  DSL Pipeline:                                                  │
│  AI output (raw JSON)                                           │
│    → validator.ts   (Zod schema enforcement)                    │
│    → normalizer.ts  (dedup, merge, style defaults)              │
│    → layout.ts      (ELK.js auto-layout, server-side)          │
│    → NormalisedDiagramDSL (stored in DB, sent to frontend)      │
│                                                                 │
│  File Parsers:                                                  │
│  ┌──────────────────┐ ┌───────────────┐ ┌──────────────────┐   │
│  │KubernetesParser  │ │ComposeParser  │ │DockerfileParser  │   │
│  └──────────────────┘ └───────────────┘ └──────────────────┘   │
│    → project-graph.ts (merges fragments, serialises for AI)    │
│                                                                 │
│  Jobs: InProcessQueue → generation.job.ts                       │
│  (Interface-compatible with BullMQ for future scaling)          │
└─────────────────────────────────────────────────────────────────┘
                          │ Prisma ORM
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                     │
│                                                                 │
│  users · projects · uploaded_files · diagrams                   │
│  diagram_versions · generation_jobs · evidence_references       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Strict Diagram DSL — the central design principle

The AI **never** emits React Flow state directly. Instead:
1. AI produces a `DiagramDSL` JSON (validated by Zod)
2. The normalizer deduplicates, merges, and adds style defaults
3. ELK.js runs layout (server-side) → adds `position` to every node
4. The result is `NormalisedDiagramDSL`, stored in the DB
5. The frontend converter (`dsl-to-flow.ts`) maps this to React Flow format

This means:
- **Format changes** in React Flow don't break the DB schema
- **Layout changes** (ELK tuning) are server-side — no frontend changes needed
- **AI quality control** is centralised in the Zod schema and normalizer
- **Imports** are safe — imported JSON is validated the same way AI output is

### 2. Provider-Agnostic AI Layer

All AI providers implement the `AIProvider` interface. The service layer selects the provider at startup based on available API keys:

```
GEMINI_API_KEY set → GeminiProvider
OPENAI_API_KEY set → OpenAIProvider
(neither)          → MockAIProvider
```

The mock provider returns realistic canned DSL, enabling full local development without any API keys.

### 3. Server-Side ELK Layout

ELK.js runs as a Node.js in-process call on the backend. Benefits:
- The frontend receives fully positioned nodes (no layout work in the browser)
- Layout parameters can be tuned server-side without frontend deploys
- The layout result is stored alongside the DSL, so diagrams reload with correct positions

### 4. Job Queue Abstraction

Generation jobs use the `JobQueue<TPayload>` interface. The MVP uses `InProcessQueue` (fire-and-forget within the Node.js process). Swapping to BullMQ requires only:
1. Implementing `BullMQQueue<TPayload>` that satisfies `JobQueue`
2. Moving the `generation.job.ts` handler to a separate worker process

### 5. Traceability — SourceRefs

Every DSL node and edge carries `sourceRefs: SourceRef[]`. Each ref records:
- `type`: `"prompt"` | `"file"` | `"inferred"`
- `fileName`, `lineStart`, `lineEnd` (for file refs)
- `snippet` (verbatim source text)
- `inferenceNote` (why this was inferred)

The `EvidenceReference` table in the DB stores these for server-side querying.

## Data Flow: Prompt → Canvas

```
User types prompt
    │
    ▼
POST /api/diagrams/generate-from-prompt
    │
    ▼
ai.service.ts:generateFromPrompt()
    │  → provider.generateFromPrompt() → AI API → raw JSON string
    │
    ▼
validator.ts: DiagramDSLSchema.parse(rawJson)
    │  Zod validates every field, cross-validates edges/groups
    │
    ▼
normalizer.ts: normaliseDSL(validated)
    │  Dedup nodes, merge edges, inject _color/_icon metadata
    │
    ▼
layout.ts: applyELKLayout(normalised)
    │  ELK.js computes node positions
    │  Returns NormalisedDiagramDSL (with position + dimensions)
    │
    ▼
DB: diagram.create({ dslJson: layout_result })
    DB: diagramVersion.create({ versionNumber: 1 })
    │
    ▼
API Response → frontend
    │
    ▼
diagram.store.ts: loadDiagram()
    │  dslToFlowNodes() + dslToFlowEdges()
    │
    ▼
React Flow renders the canvas
```

## Shared Package

`packages/shared` contains TypeScript types and Zod schemas used by both frontend and backend:

- `DiagramDSL` / `NormalisedDiagramDSL` — the canonical intermediate representation
- `DiagramDSLSchema` — Zod validator (cross-field validation included)
- API contract schemas (request/response types for all endpoints)

This guarantees **end-to-end type safety** without a code generation step.

## Security Notes (MVP)

- JWT secret must be ≥ 32 characters; rotate in production
- File uploads: size-limited (10 MB), extension-allowlisted, never executed
- API keys (Gemini/OpenAI) live only on the server, never exposed to the frontend
- Rate limiting: 10 req/min for generation endpoints, 120 req/min for general API
- All rendered text is passed through React's XSS-safe string handling (no dangerouslySetInnerHTML)
