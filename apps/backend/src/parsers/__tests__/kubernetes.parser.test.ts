import { describe, it, expect } from "vitest";
import { KubernetesParser } from "../kubernetes.parser.js";

const parser = new KubernetesParser();

const K8S_DEPLOYMENT = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: my-org/api-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          value: postgres://db:5432/mydb
        - name: REDIS_HOST
          value: redis:6379
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  ports:
  - port: 80
  selector:
    app: api-server
`;

describe("KubernetesParser", () => {
  it("detects K8s YAML files", () => {
    expect(parser.canParse("deployment.yaml", K8S_DEPLOYMENT)).toBe(true);
    expect(parser.canParse("docker-compose.yml", "services:")).toBe(false);
  });

  it("extracts Deployment as a service node", () => {
    const fragment = parser.parse("deployment.yaml", K8S_DEPLOYMENT);
    const deployment = fragment.services.find((s) => s.kind === "Deployment");
    expect(deployment).toBeDefined();
    expect(deployment!.name).toBe("api-server");
    expect(deployment!.image).toBe("my-org/api-server:latest");
    expect(deployment!.ports).toContain(3000);
  });

  it("infers database and redis dependencies from env vars", () => {
    const fragment = parser.parse("deployment.yaml", K8S_DEPLOYMENT);
    const deployment = fragment.services.find((s) => s.name === "api-server")!;
    expect(deployment.dependsOn).toContain("database");
    expect(deployment.dependsOn).toContain("redis");
  });

  it("extracts Service node", () => {
    const fragment = parser.parse("deployment.yaml", K8S_DEPLOYMENT);
    const svc = fragment.services.find((s) => s.kind === "service");
    expect(svc).toBeDefined();
    expect(svc!.ports).toContain(80);
  });

  it("handles multi-document YAML", () => {
    const fragment = parser.parse("deployment.yaml", K8S_DEPLOYMENT);
    expect(fragment.services.length).toBeGreaterThanOrEqual(2);
  });
});
