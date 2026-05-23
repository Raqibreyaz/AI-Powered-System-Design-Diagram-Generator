import { describe, it, expect } from "vitest";
import { DiagramDSLSchema } from "@diagram-forge/shared";

const VALID_DSL = {
  schemaVersion: "1.0",
  diagramType: "architecture",
  title: "Test",
  summary: "Test diagram",
  confidence: 0.9,
  nodes: [
    {
      id: "api",
      type: "service",
      label: "API",
      confidence: 0.9,
      sourceRefs: [],
    },
    {
      id: "db",
      type: "database",
      label: "Database",
      confidence: 1.0,
      sourceRefs: [],
    },
  ],
  edges: [
    {
      id: "api_to_db",
      from: "api",
      to: "db",
      direction: "forward",
      confidence: 0.95,
      sourceRefs: [],
    },
  ],
  groups: [],
  annotations: [],
  unresolvedItems: [],
};

describe("DiagramDSLSchema", () => {
  it("accepts a valid DSL", () => {
    expect(() => DiagramDSLSchema.parse(VALID_DSL)).not.toThrow();
  });

  it("rejects an edge referencing a non-existent node", () => {
    const bad = {
      ...VALID_DSL,
      edges: [
        { id: "bad", from: "api", to: "nonexistent", direction: "forward", confidence: 0.9, sourceRefs: [] },
      ],
    };
    const result = DiagramDSLSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects missing schemaVersion", () => {
    const { schemaVersion: _, ...bad } = VALID_DSL;
    const result = DiagramDSLSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const bad = { ...VALID_DSL, confidence: 1.5 };
    const result = DiagramDSLSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects unknown node type", () => {
    const bad = {
      ...VALID_DSL,
      nodes: [{ ...VALID_DSL.nodes[0], type: "unknown_type" }],
    };
    const result = DiagramDSLSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects extra fields in strict mode", () => {
    const bad = { ...VALID_DSL, extraField: "should-fail" };
    const result = DiagramDSLSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
