import { describe, it, expect } from "vitest";
import { normaliseDSL } from "../normalizer.js";
import type { DiagramDSLOutput } from "@diagram-forge/shared";

function makeDSL(overrides: Partial<DiagramDSLOutput> = {}): DiagramDSLOutput {
  return {
    schemaVersion: "1.0",
    diagramType: "architecture",
    title: "Test",
    summary: "Test",
    confidence: 0.9,
    nodes: [],
    edges: [],
    groups: [],
    annotations: [],
    unresolvedItems: [],
    ...overrides,
  };
}

describe("normaliseDSL", () => {
  it("deduplicates nodes with the same label (case-insensitive)", () => {
    const dsl = makeDSL({
      nodes: [
        { id: "api_1", type: "service", label: "API Service", confidence: 0.8, sourceRefs: [] },
        { id: "api_2", type: "service", label: "api service", confidence: 0.9, sourceRefs: [] },
      ],
      edges: [],
    });

    const result = normaliseDSL(dsl);
    expect(result.nodes).toHaveLength(1);
    // Winner should be the higher-confidence one
    expect(result.nodes[0]!.confidence).toBe(0.9);
  });

  it("merges duplicate edges (same from+to)", () => {
    const dsl = makeDSL({
      nodes: [
        { id: "a", type: "service", label: "A", confidence: 1.0, sourceRefs: [] },
        { id: "b", type: "database", label: "B", confidence: 1.0, sourceRefs: [] },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", direction: "forward", confidence: 0.9, sourceRefs: [] },
        { id: "e2", from: "a", to: "b", direction: "forward", confidence: 0.7, sourceRefs: [{ type: "inferred" }] },
      ],
    });

    const result = normaliseDSL(dsl);
    expect(result.edges).toHaveLength(1);
  });

  it("removes self-loop edges", () => {
    const dsl = makeDSL({
      nodes: [{ id: "a", type: "service", label: "A", confidence: 1.0, sourceRefs: [] }],
      edges: [{ id: "self", from: "a", to: "a", direction: "forward", confidence: 0.5, sourceRefs: [] }],
    });

    const result = normaliseDSL(dsl);
    expect(result.edges).toHaveLength(0);
  });

  it("injects _color and _icon into node metadata", () => {
    const dsl = makeDSL({
      nodes: [{ id: "db", type: "database", label: "DB", confidence: 1.0, sourceRefs: [] }],
      edges: [],
    });

    const result = normaliseDSL(dsl);
    expect(result.nodes[0]!.metadata).toMatchObject({ _color: "#8b5cf6", _icon: "database" });
  });

  it("cleans up group children that reference deduped nodes", () => {
    const dsl = makeDSL({
      nodes: [
        { id: "api_1", type: "service", label: "API", confidence: 0.8, sourceRefs: [] },
        { id: "api_2", type: "service", label: "api", confidence: 0.9, sourceRefs: [] },
        { id: "db", type: "database", label: "DB", confidence: 1.0, sourceRefs: [] },
      ],
      edges: [],
      groups: [{ id: "g1", label: "Backend", children: ["api_1", "api_2", "db"] }],
    });

    const result = normaliseDSL(dsl);
    // After dedup, only one api node survives → group should have 2 children max
    expect(result.groups[0]!.children.length).toBeLessThanOrEqual(2);
  });
});
