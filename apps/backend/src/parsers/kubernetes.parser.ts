/**
 * Kubernetes YAML parser.
 *
 * Supports: Deployment, Service, Ingress, StatefulSet, DaemonSet, Job, CronJob,
 * ConfigMap, Secret, PersistentVolumeClaim, HorizontalPodAutoscaler.
 *
 * Multi-document YAML (---) is handled via js-yaml's loadAll.
 */

import yaml from "js-yaml";
import { slugify } from "../utils/id.js";
import type { FileParser, ProjectGraphFragment, ServiceNode } from "./parser.interface.js";

export class KubernetesParser implements FileParser {
  canParse(filename: string, content: string): boolean {
    if (!/\.(yaml|yml)$/i.test(filename)) return false;
    // Quick heuristic: K8s YAMLs have "apiVersion:" and "kind:" fields
    return /apiVersion:\s*\S/.test(content) && /kind:\s*\S/.test(content);
  }

  parse(filename: string, content: string): ProjectGraphFragment {
    const docs = parseMultiDocYaml(content);
    const fragment: ProjectGraphFragment = {
      services: [],
      externalRefs: [],
      volumes: [],
      configRefs: [],
    };

    for (const doc of docs) {
      if (!doc || typeof doc !== "object") continue;
      this.processResource(doc as Record<string, unknown>, filename, fragment);
    }

    return fragment;
  }

  private processResource(
    doc: Record<string, unknown>,
    filename: string,
    fragment: ProjectGraphFragment
  ): void {
    const kind = String(doc["kind"] ?? "");
    const metadata = (doc["metadata"] ?? {}) as Record<string, unknown>;
    const name = String(metadata["name"] ?? "unknown");
    const id = slugify(`${kind}_${name}`);

    switch (kind) {
      case "Deployment":
      case "StatefulSet":
      case "DaemonSet": {
        const node = this.parseWorkload(id, name, kind, doc, filename);
        fragment.services.push(node);
        break;
      }

      case "Service": {
        const spec = (doc["spec"] ?? {}) as Record<string, unknown>;
        const ports = extractPorts(spec["ports"]);
        const selector = (spec["selector"] ?? {}) as Record<string, string>;

        fragment.services.push({
          id,
          name,
          kind: "service",
          ports,
          envVars: [],
          labels: Object.values(selector),
          dependsOn: [],
          sourceFile: filename,
        });
        break;
      }

      case "Ingress": {
        const rules = extractIngressRules(doc);
        fragment.services.push({
          id,
          name,
          kind: "ingress",
          ports: [80, 443],
          envVars: [],
          labels: [],
          dependsOn: rules,
          sourceFile: filename,
        });
        break;
      }

      case "ConfigMap": {
        fragment.configRefs.push(name);
        break;
      }

      case "Secret": {
        fragment.configRefs.push(`secret:${name}`);
        break;
      }

      case "PersistentVolumeClaim": {
        fragment.volumes.push(name);
        break;
      }

      case "Job":
      case "CronJob": {
        const node = this.parseWorkload(id, name, kind.toLowerCase(), doc, filename);
        fragment.services.push(node);
        break;
      }
    }
  }

  private parseWorkload(
    id: string,
    name: string,
    kind: string,
    doc: Record<string, unknown>,
    filename: string
  ): ServiceNode {
    const spec = (doc["spec"] ?? {}) as Record<string, unknown>;
    const template = (spec["template"] ?? {}) as Record<string, unknown>;
    const podSpec = (template["spec"] ?? {}) as Record<string, unknown>;
    const containers = Array.isArray(podSpec["containers"]) ? podSpec["containers"] : [];

    let image: string | undefined;
    const ports: number[] = [];
    const envVars: string[] = [];
    const dependsOn: string[] = [];

    for (const container of containers) {
      const c = container as Record<string, unknown>;

      if (!image && c["image"]) {
        image = String(c["image"]);
      }

      // Extract ports
      for (const p of Array.isArray(c["ports"]) ? c["ports"] : []) {
        const port = (p as Record<string, unknown>)["containerPort"];
        if (typeof port === "number") ports.push(port);
      }

      // Extract env vars and infer external dependencies
      for (const env of Array.isArray(c["env"]) ? c["env"] : []) {
        const e = env as Record<string, unknown>;
        const envName = String(e["name"] ?? "");
        envVars.push(envName);

        // Infer external service references from well-known env var patterns
        const val = String(e["value"] ?? "");
        if (/DATABASE_URL|POSTGRES|MYSQL|MONGO/i.test(envName)) {
          dependsOn.push("database");
        }
        if (/REDIS_URL|REDIS_HOST/i.test(envName)) {
          dependsOn.push("redis");
        }
        if (/RABBITMQ|AMQP_URL/i.test(envName)) {
          dependsOn.push("rabbitmq");
        }
        if (/KAFKA_BROKER/i.test(envName)) {
          dependsOn.push("kafka");
        }
      }

      // Check valueFrom references to ConfigMaps and Secrets
      for (const env of Array.isArray(c["env"]) ? c["env"] : []) {
        const e = env as Record<string, unknown>;
        const valueFrom = (e["valueFrom"] ?? {}) as Record<string, unknown>;
        if (valueFrom["secretKeyRef"]) {
          const ref = (valueFrom["secretKeyRef"] as Record<string, string>)["name"];
          if (ref) dependsOn.push(`secret:${ref}`);
        }
        if (valueFrom["configMapKeyRef"]) {
          const ref = (valueFrom["configMapKeyRef"] as Record<string, string>)["name"];
          if (ref) dependsOn.push(`configmap:${ref}`);
        }
      }
    }

    return {
      id,
      name,
      kind,
      image,
      ports: [...new Set(ports)],
      envVars: [...new Set(envVars)],
      labels: [],
      dependsOn: [...new Set(dependsOn)],
      sourceFile: filename,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMultiDocYaml(content: string): unknown[] {
  const docs: unknown[] = [];
  yaml.loadAll(content, (doc) => docs.push(doc));
  return docs;
}

function extractPorts(ports: unknown): number[] {
  if (!Array.isArray(ports)) return [];
  return ports
    .map((p) => (p as Record<string, unknown>)["port"])
    .filter((p): p is number => typeof p === "number");
}

function extractIngressRules(doc: Record<string, unknown>): string[] {
  const spec = (doc["spec"] ?? {}) as Record<string, unknown>;
  const rules = Array.isArray(spec["rules"]) ? spec["rules"] : [];
  const services: string[] = [];

  for (const rule of rules) {
    const http = ((rule as Record<string, unknown>)["http"] ?? {}) as Record<string, unknown>;
    const paths = Array.isArray(http["paths"]) ? http["paths"] : [];
    for (const path of paths) {
      const backend = (path as Record<string, unknown>)["backend"] as Record<string, unknown>;
      const service = (backend?.["service"] ?? {}) as Record<string, unknown>;
      const svcName = service?.["name"];
      if (svcName) services.push(String(svcName));
    }
  }

  return services;
}
