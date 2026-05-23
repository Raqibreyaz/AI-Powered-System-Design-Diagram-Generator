/**
 * Project Graph builder — merges fragments from multiple file parsers into a
 * single intermediate ProjectGraph that gets summarised and sent to the AI.
 *
 * The serialised graph is designed to be a compact, readable summary that fits
 * comfortably in an AI context window.
 */

import { KubernetesParser } from "./kubernetes.parser.js";
import { ComposeParser } from "./compose.parser.js";
import { DockerfileParser } from "./dockerfile.parser.js";
import type { FileParser, ProjectGraphFragment, ServiceNode } from "./parser.interface.js";
import { slugify } from "../utils/id.js";
import { logger } from "../utils/logger.js";

const PARSERS: FileParser[] = [
  new KubernetesParser(),
  new ComposeParser(),
  new DockerfileParser(),
];

export interface ProjectGraph {
  services: ServiceNode[];
  volumes: string[];
  configRefs: string[];
  externalRefs: Array<{ name: string; kind: string; inferredFrom: string; sourceFile: string }>;
  parseErrors: Array<{ file: string; error: string }>;
}

export interface FileInput {
  name: string;
  content: string;
}

/** Parse multiple files and merge all fragments into one ProjectGraph */
export function buildProjectGraph(files: FileInput[]): ProjectGraph {
  const graph: ProjectGraph = {
    services: [],
    volumes: [],
    configRefs: [],
    externalRefs: [],
    parseErrors: [],
  };

  for (const file of files) {
    const parser = PARSERS.find((p) => p.canParse(file.name, file.content));

    if (!parser) {
      logger.debug({ file: file.name }, "no parser found — skipping file");
      continue;
    }

    try {
      const fragment = parser.parse(file.name, file.content);
      mergeFragment(graph, fragment);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ file: file.name, error: message }, "parser error");
      graph.parseErrors.push({ file: file.name, error: message });
    }
  }

  // Deduplicate by id
  graph.services = deduplicateServices(graph.services);
  graph.volumes = [...new Set(graph.volumes)];
  graph.configRefs = [...new Set(graph.configRefs)];

  return graph;
}

/** Serialise the project graph into a compact string for the AI prompt */
export function serialiseProjectGraph(graph: ProjectGraph): string {
  const lines: string[] = [];

  lines.push(`=== PROJECT GRAPH (${graph.services.length} services) ===\n`);

  for (const svc of graph.services) {
    lines.push(`[${svc.kind.toUpperCase()}] ${svc.name}`);
    if (svc.image) lines.push(`  image: ${svc.image}`);
    if (svc.ports.length > 0) lines.push(`  ports: ${svc.ports.join(", ")}`);
    if (svc.dependsOn.length > 0) lines.push(`  depends_on: ${svc.dependsOn.join(", ")}`);
    lines.push(`  source: ${svc.sourceFile}`);
    lines.push("");
  }

  if (graph.externalRefs.length > 0) {
    lines.push(`=== EXTERNAL REFERENCES ===`);
    for (const ref of graph.externalRefs) {
      lines.push(`[${ref.kind.toUpperCase()}] ${ref.name} (inferred from: ${ref.inferredFrom})`);
    }
    lines.push("");
  }

  if (graph.volumes.length > 0) {
    lines.push(`=== VOLUMES ===`);
    lines.push(graph.volumes.join(", "));
    lines.push("");
  }

  if (graph.configRefs.length > 0) {
    lines.push(`=== CONFIG MAPS / SECRETS ===`);
    lines.push(graph.configRefs.join(", "));
  }

  if (graph.parseErrors.length > 0) {
    lines.push(`\n=== PARSE ERRORS ===`);
    for (const e of graph.parseErrors) {
      lines.push(`  ${e.file}: ${e.error}`);
    }
  }

  return lines.join("\n");
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function mergeFragment(graph: ProjectGraph, fragment: ProjectGraphFragment): void {
  graph.services.push(...fragment.services);
  graph.volumes.push(...fragment.volumes);
  graph.configRefs.push(...fragment.configRefs);
  graph.externalRefs.push(...fragment.externalRefs);
}

function deduplicateServices(services: ServiceNode[]): ServiceNode[] {
  const seen = new Map<string, ServiceNode>();
  for (const svc of services) {
    const key = slugify(svc.name);
    if (!seen.has(key)) {
      seen.set(key, svc);
    } else {
      // Merge ports and dependsOn into the existing entry
      const existing = seen.get(key)!;
      existing.ports = [...new Set([...existing.ports, ...svc.ports])];
      existing.dependsOn = [...new Set([...existing.dependsOn, ...svc.dependsOn])];
    }
  }
  return Array.from(seen.values());
}
