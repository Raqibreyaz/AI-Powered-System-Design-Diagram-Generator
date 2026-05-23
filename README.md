# Diagram Forge

AI-powered system design diagram generator. Generate editable architecture, flowchart, and sequence diagrams from natural language prompts or uploaded infrastructure files.

## Features

- **Prompt → Diagram** — type a description, get an editable canvas
- **Files → Diagram** — upload K8s YAMLs, Docker Compose, Dockerfiles
- **Strict DSL pipeline** — AI output is validated → normalised → ELK-laid-out → rendered
- **Full editing** — drag nodes, rename labels, add/remove edges, undo/redo
- **Traceability** — every node/edge links back to its source prompt fragment or file line
- **Versioning** — every save creates a new version; restore any previous version
- **Export** — JSON (re-importable), PNG, SVG
- **Provider-agnostic AI** — Gemini (preferred), OpenAI, or Mock (dev/offline)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Canvas | React Flow (@xyflow/react) |
| State | Zustand |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL + Prisma |
| Auto-layout | ELK.js (server-side) |
| Validation | Zod (shared schemas) |
| AI | Gemini / OpenAI / Mock |
| Monorepo | npm workspaces |

## Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local or Docker)
- npm ≥ 10

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd diagram-forge
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL
# Add GEMINI_API_KEY or OPENAI_API_KEY for real AI (optional — Mock works without)

# 3. Set up the database
npm run db:migrate       # runs prisma migrate dev
npm run db:generate      # generates Prisma client
npm run db:seed          # creates demo user, project, and sample diagram

# 4. Start both servers
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | At least 32 chars, used to sign tokens |
| `GEMINI_API_KEY` | No | Activates Gemini provider (preferred) |
| `OPENAI_API_KEY` | No | Activates OpenAI provider (fallback) |
| `UPLOAD_DIR` | No | Where uploaded files are stored (default: `./uploads`) |

**Provider selection:** If `GEMINI_API_KEY` is set → Gemini. Else if `OPENAI_API_KEY` → OpenAI. Else → Mock (safe for dev).

## Project Structure

```
diagram-forge/
├── apps/
│   ├── frontend/          # React + Vite
│   └── backend/           # Fastify + Prisma
│       └── prisma/        # Schema + migrations + seed
├── packages/
│   └── shared/            # DSL types + Zod schemas + API contracts
├── fixtures/              # Sample infra files for testing
└── ...
```

## API Quick Reference

```
POST /api/auth/demo-login                  — get a JWT
POST /api/projects                         — create project
POST /api/diagrams/generate-from-prompt    — prompt → diagram
POST /api/diagrams/generate-from-files     — files → diagram
GET  /api/diagrams/:id                     — get diagram
PATCH /api/diagrams/:id                    — save edits
GET  /api/diagrams/:id/versions            — list versions
POST /api/diagrams/:id/restore-version     — restore version
POST /api/diagrams/:id/export              — export JSON/SVG
```

## Manual Test Scenarios

### 1. Prompt-to-Diagram
1. Open `http://localhost:5173`
2. Click **Open App**
3. Enter: `Scalable video transcoding pipeline with ECS, S3, CDN, and monitoring`
4. Set complexity to **Detailed**, click **Generate**
5. Verify diagram renders on canvas with nodes and edges

### 2. Node Editing + Save
1. After generating, double-click a node label to rename it
2. Drag a node to a new position
3. Click **Save** (or Ctrl+S)
4. Reload the page — verify position and label persist

### 3. File-to-Diagram
1. Create a project (required for file uploads)
2. Switch to **From Files** tab in the left panel
3. Drop `fixtures/docker-compose-sample.yml`
4. Click **Upload & Generate**
5. Verify the canvas shows services (nginx, api, worker, postgres, redis, rabbitmq)

### 4. Export JSON + Re-import
1. Generate a diagram
2. Click the export button → **Export JSON**
3. Save the file
4. Start fresh (reload), import the JSON back (drag-and-drop or paste)
5. Verify the diagram is identical

### 5. Version History + Restore
1. Generate a diagram (v1)
2. Edit a node label and save (v2)
3. Navigate to **History** (top-left link)
4. Click **Restore** on v1
5. Verify the canvas returns to the original state

## Running Tests

```bash
npm run test            # all packages
# or specifically:
cd apps/backend && npm test
```

## Development Notes

- The `packages/shared` package must be built before the backend starts in production (`npm run build --workspace=packages/shared`). In dev, `tsx` resolves TypeScript directly via path alias.
- Uploaded files are stored in `./uploads/<projectId>/`. This directory is gitignored.
- The mock AI provider returns realistic canned DSL so the full pipeline (validate → normalise → ELK → React Flow) can be tested without an API key.
