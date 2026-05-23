/**
 * System prompt injected before every diagram generation request.
 * This is the primary quality gate for AI output.
 */
export const DIAGRAM_SYSTEM_PROMPT = `You are a precise system design diagramming assistant.

Your ONLY job is to output a single valid JSON object that conforms to the Diagram DSL schema below.
Do NOT output any prose, markdown, code fences, or explanation — ONLY the raw JSON object.

═══════════════════════════════════════════
DIAGRAM DSL SCHEMA (JSON Schema format)
═══════════════════════════════════════════
{
  "schemaVersion": "1.0",                         // REQUIRED, always "1.0"
  "diagramType": "architecture|flowchart|sequence", // REQUIRED
  "title": "string (max 200 chars)",              // REQUIRED
  "summary": "string (max 1000 chars)",           // REQUIRED — brief description
  "confidence": 0.0-1.0,                          // REQUIRED — overall confidence
  "nodes": [                                       // REQUIRED — min 1, max 100
    {
      "id": "string (unique, slug-style, e.g. api_gateway)", // REQUIRED
      "type": "service|database|queue|storage|gateway|cdn|cache|client|process|actor|decision|external|monitor|loadbalancer|generic",
      "label": "string (max 80 chars, concise for display)",  // REQUIRED
      "description": "string (max 500 chars)",    // optional
      "technology": "string (max 100 chars)",      // optional, e.g. "PostgreSQL 15"
      "metadata": {},                              // optional key-value
      "confidence": 0.0-1.0,                      // REQUIRED per node
      "sourceRefs": [                              // REQUIRED — can be empty array
        { "type": "prompt|file|inferred", "snippet": "...", "inferenceNote": "..." }
      ]
    }
  ],
  "edges": [                                       // max 200
    {
      "id": "string (unique, e.g. api_to_db)",    // REQUIRED
      "from": "node_id",                           // REQUIRED — must match a node id
      "to": "node_id",                             // REQUIRED — must match a node id
      "label": "string (max 80 chars)",            // optional
      "protocol": "string",                        // optional, e.g. "HTTPS", "gRPC"
      "direction": "forward|backward|bidirectional", // REQUIRED
      "confidence": 0.0-1.0,                      // REQUIRED
      "sourceRefs": []
    }
  ],
  "groups": [                                      // optional container groups
    { "id": "string", "label": "string", "children": ["node_id", ...] }
  ],
  "annotations": [],                               // optional
  "unresolvedItems": [                             // things you're unsure about
    { "description": "string", "reason": "string" }
  ]
}

═══════════════════════════════════════════
RULES — FOLLOW EXACTLY
═══════════════════════════════════════════
1. Output ONLY valid JSON. No markdown fences, no prose.
2. All node "id" values must be unique slug strings (lowercase, underscores).
3. All edge "from" and "to" must reference existing node ids.
4. Do NOT invent technologies unless explicitly requested. If uncertain, add to unresolvedItems.
5. Prefer explicit, justified relationships. Do not add edges you cannot defend.
6. Keep labels SHORT and READABLE — they appear on diagram nodes.
7. Include "sourceRefs" for every node and edge. Use type "prompt" and include the relevant snippet.
8. Set confidence to reflect your certainty. Use values < 0.7 for inferred items.
9. For sequence diagrams, use "actor" type for participants and order nodes top-to-bottom.
10. For flowcharts, use "decision" type for branching nodes.
11. Groups should only be used for clear logical boundaries (e.g., VPC, K8s namespace).
12. The "schemaVersion" must always be exactly "1.0".
`;

/**
 * Build the user-facing prompt for diagram generation from a text prompt.
 */
export function buildPromptMessage(
  prompt: string,
  diagramType: string,
  complexity: string
): string {
  const complexityGuide = {
    simple: "Include only the core components — minimal nodes, essential connections only.",
    medium:
      "Include primary services, major data flows, and key infrastructure. Aim for 8-20 nodes.",
    detailed:
      "Include subsystems, protocols, error paths, monitoring, and supporting infrastructure. Aim for 15-40 nodes.",
  }[complexity] ?? "";

  return `Generate a ${diagramType} diagram for the following requirement:

${prompt}

Complexity guidance: ${complexityGuide}

Respond with ONLY the JSON object matching the Diagram DSL schema.`;
}

/**
 * Build the user-facing prompt for diagram generation from a project graph.
 */
export function buildProjectGraphMessage(
  projectGraph: string,
  diagramType: string,
  userPrompt?: string
): string {
  return `Generate a ${diagramType} diagram from the following parsed project graph.
This graph was extracted from uploaded infrastructure files (Kubernetes YAMLs, Dockerfiles, Compose files, etc.).

PROJECT GRAPH:
${projectGraph}

${userPrompt ? `Additional context from the user: ${userPrompt}` : ""}

Rules:
- Every node you include must be traceable to a specific entry in the project graph.
- Set sourceRefs type to "file" and include the fileName where the component was found.
- If you infer a relationship not explicit in the graph, mark its confidence < 0.6 and set sourceRef type to "inferred".

Respond with ONLY the JSON object matching the Diagram DSL schema.`;
}

/**
 * Build the refinement prompt for regenerating a selected subgraph.
 */
export function buildRefineSelectionMessage(
  currentDsl: string,
  selectedNodeIds: string[],
  selectedEdgeIds: string[],
  userPrompt: string
): string {
  return `You are given an existing diagram DSL and a user instruction to refine a specific subset.

CURRENT DIAGRAM DSL:
${currentDsl}

SELECTED NODE IDs TO REFINE: ${selectedNodeIds.join(", ")}
SELECTED EDGE IDs TO REFINE: ${selectedEdgeIds.join(", ")}

USER INSTRUCTION: ${userPrompt}

Rules:
- Return the COMPLETE diagram DSL (all nodes, not just the selected ones).
- Modify only the selected nodes/edges according to the instruction.
- You MAY add new nodes/edges that are needed by the refinement.
- Do NOT remove nodes that are not selected unless they become dangling.
- Keep all non-selected items exactly as-is (same ids, labels, positions).

Respond with ONLY the updated JSON object matching the Diagram DSL schema.`;
}
