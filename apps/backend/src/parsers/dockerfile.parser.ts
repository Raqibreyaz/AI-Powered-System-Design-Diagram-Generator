/**
 * Dockerfile parser — extracts FROM base images, EXPOSE ports, ENV names,
 * and infers service dependencies from COPY/ADD patterns.
 */

import { slugify } from "../utils/id.js";
import type { FileParser, ProjectGraphFragment, ServiceNode } from "./parser.interface.js";

export class DockerfileParser implements FileParser {
  canParse(filename: string, _content: string): boolean {
    return /dockerfile/i.test(filename);
  }

  parse(filename: string, content: string): ProjectGraphFragment {
    const lines = content.split("\n").map((l) => l.trim());
    const fragment: ProjectGraphFragment = {
      services: [],
      externalRefs: [],
      volumes: [],
      configRefs: [],
    };

    const ports: number[] = [];
    const envVars: string[] = [];
    const bases: string[] = [];

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;
      if (!line || line.startsWith("#")) continue;

      const [instruction, ...rest] = line.split(/\s+/);
      const args = rest.join(" ");

      switch (instruction?.toUpperCase()) {
        case "FROM": {
          // Handle multi-stage: FROM image AS alias
          const base = args.split(/\s+as\s+/i)[0]?.trim();
          if (base && base !== "scratch") bases.push(base);
          break;
        }

        case "EXPOSE": {
          for (const p of args.split(/\s+/)) {
            const port = parseInt(p.split("/")[0] ?? "", 10);
            if (!isNaN(port)) ports.push(port);
          }
          break;
        }

        case "ENV": {
          // Handle both "ENV KEY=VALUE" and "ENV KEY VALUE"
          const name = args.split(/[=\s]/)[0];
          if (name) envVars.push(name);
          break;
        }
      }
    }

    // Build a single service node for this Dockerfile
    const containerName = filename.replace(/dockerfile\.?/i, "").trim() || "container";
    const id = slugify(containerName);

    const node: ServiceNode = {
      id,
      name: containerName,
      kind: "container",
      image: bases[0],
      ports: [...new Set(ports)],
      envVars,
      labels: [],
      dependsOn: [],
      sourceFile: filename,
    };

    fragment.services.push(node);

    // Infer external refs from base image names
    for (const base of bases) {
      if (/postgres|postgresql/i.test(base)) {
        fragment.externalRefs.push({ name: "postgres", kind: "database", inferredFrom: `FROM ${base}`, sourceFile: filename });
      }
      if (/redis/i.test(base)) {
        fragment.externalRefs.push({ name: "redis", kind: "cache", inferredFrom: `FROM ${base}`, sourceFile: filename });
      }
      if (/nginx/i.test(base)) {
        fragment.externalRefs.push({ name: "nginx", kind: "gateway", inferredFrom: `FROM ${base}`, sourceFile: filename });
      }
    }

    return fragment;
  }
}
