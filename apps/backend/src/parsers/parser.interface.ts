/**
 * FileParser interface — all file parsers implement this contract.
 *
 * A parser receives the raw file content + filename and returns a
 * ProjectGraphFragment — a partial graph of services, dependencies, and
 * infrastructure items extracted from that file.
 */

export interface ServiceNode {
  id: string;
  name: string;
  /** "deployment" | "service" | "ingress" | "container" | "volume" | "queue" | etc. */
  kind: string;
  image?: string;
  ports: number[];
  envVars: string[];
  labels: string[];
  /** Names of other services this one depends on */
  dependsOn: string[];
  /** Source file traceability */
  sourceFile: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ProjectGraphFragment {
  services: ServiceNode[];
  /** External services inferred from env vars or references (e.g. DATABASE_URL → postgres) */
  externalRefs: Array<{
    name: string;
    kind: string;
    inferredFrom: string;
    sourceFile: string;
  }>;
  /** Raw volumes referenced */
  volumes: string[];
  /** Config map / secret names referenced */
  configRefs: string[];
}

export interface FileParser {
  /** True if this parser can handle the given filename */
  canParse(filename: string, content: string): boolean;
  parse(filename: string, content: string): ProjectGraphFragment;
}
