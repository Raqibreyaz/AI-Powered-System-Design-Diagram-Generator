/**
 * Docker Compose parser.
 * Handles compose v2/v3 files: services, volumes, networks, depends_on.
 */

import yaml from "js-yaml";
import { slugify } from "../utils/id.js";
import type { FileParser, ProjectGraphFragment, ServiceNode } from "./parser.interface.js";

export class ComposeParser implements FileParser {
  canParse(filename: string, content: string): boolean {
    if (!/\.(yaml|yml)$/i.test(filename)) return false;
    // Compose files typically have a "services:" top-level key
    return /^services:\s*$/m.test(content);
  }

  parse(filename: string, content: string): ProjectGraphFragment {
    const doc = yaml.load(content) as Record<string, unknown>;
    const fragment: ProjectGraphFragment = {
      services: [],
      externalRefs: [],
      volumes: [],
      configRefs: [],
    };

    // Top-level volumes
    const topLevelVolumes = Object.keys(
      (doc["volumes"] ?? {}) as Record<string, unknown>
    );
    fragment.volumes.push(...topLevelVolumes);

    const services = (doc["services"] ?? {}) as Record<string, unknown>;

    for (const [serviceName, rawService] of Object.entries(services)) {
      const svc = (rawService ?? {}) as Record<string, unknown>;
      const id = slugify(serviceName);

      const ports = parseComposePorts(svc["ports"]);
      const dependsOn = parseDependsOn(svc["depends_on"]);
      const envVars = parseEnvVars(svc["environment"]);
      const volumes = parseVolumes(svc["volumes"]);

      fragment.volumes.push(...volumes.named);

      // Infer external dependencies from image name
      const image = String(svc["image"] ?? svc["build"] ?? "");
      const inferredDeps: string[] = [];
      if (/postgres|postgresql/i.test(image)) inferredDeps.push("postgres");
      if (/mysql|mariadb/i.test(image)) inferredDeps.push("mysql");
      if (/mongo/i.test(image)) inferredDeps.push("mongodb");
      if (/redis/i.test(image)) inferredDeps.push("redis");
      if (/rabbitmq/i.test(image)) inferredDeps.push("rabbitmq");
      if (/kafka/i.test(image)) inferredDeps.push("kafka");
      if (/nginx/i.test(image)) inferredDeps.push("nginx");

      const node: ServiceNode = {
        id,
        name: serviceName,
        kind: "container",
        image: typeof svc["image"] === "string" ? svc["image"] : undefined,
        ports,
        envVars,
        labels: [],
        dependsOn: [...new Set([...dependsOn, ...inferredDeps])],
        sourceFile: filename,
      };

      fragment.services.push(node);
    }

    return fragment;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseComposePorts(ports: unknown): number[] {
  if (!Array.isArray(ports)) return [];
  const result: number[] = [];
  for (const p of ports) {
    const str = String(p);
    // Handle "host:container" or "container" format
    const parts = str.split(":");
    const containerPort = parseInt(parts[parts.length - 1] ?? "", 10);
    if (!isNaN(containerPort)) result.push(containerPort);
  }
  return result;
}

function parseDependsOn(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === "object") return Object.keys(raw as object);
  return [];
}

function parseEnvVars(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).split("=")[0] ?? String(e));
  }
  if (typeof raw === "object") {
    return Object.keys(raw as object);
  }
  return [];
}

function parseVolumes(raw: unknown): { named: string[]; bind: string[] } {
  const result = { named: [] as string[], bind: [] as string[] };
  if (!Array.isArray(raw)) return result;
  for (const v of raw) {
    const str = String(v);
    if (str.startsWith("/") || str.startsWith(".")) {
      result.bind.push(str);
    } else {
      const name = str.split(":")[0];
      if (name) result.named.push(name);
    }
  }
  return result;
}
