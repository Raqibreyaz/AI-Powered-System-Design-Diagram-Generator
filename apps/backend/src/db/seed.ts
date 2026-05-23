/**
 * MongoDB Mongoose seed — creates a demo user, project, and sample diagram.
 * Run: npm run db:seed (from root)
 */

import { connectMongo, disconnectMongo } from "./mongo.js";
import { User, Project, Diagram, DiagramVersion } from "./models.js";

const DEMO_DIAGRAM_DSL = {
  schemaVersion: "1.0",
  diagramType: "architecture",
  title: "E-Commerce Platform Architecture",
  summary:
    "A scalable e-commerce platform with API gateway, microservices, event queue, and managed databases.",
  confidence: 0.92,
  nodes: [
    { id: "browser", type: "client", label: "Browser", confidence: 1.0, sourceRefs: [{ type: "prompt" }] },
    { id: "cdn", type: "cdn", label: "CDN", technology: "CloudFront", confidence: 0.9, sourceRefs: [{ type: "prompt" }] },
    { id: "api_gw", type: "gateway", label: "API Gateway", technology: "Kong", confidence: 0.95, sourceRefs: [{ type: "prompt" }] },
    { id: "order_svc", type: "service", label: "Order Service", technology: "Node.js", confidence: 0.95, sourceRefs: [{ type: "prompt" }] },
    { id: "product_svc", type: "service", label: "Product Service", technology: "Python/FastAPI", confidence: 0.95, sourceRefs: [{ type: "prompt" }] },
    { id: "user_svc", type: "service", label: "User Service", technology: "Go", confidence: 0.9, sourceRefs: [{ type: "prompt" }] },
    { id: "order_db", type: "database", label: "Orders DB", technology: "PostgreSQL", confidence: 1.0, sourceRefs: [{ type: "prompt" }] },
    { id: "product_db", type: "database", label: "Products DB", technology: "MongoDB", confidence: 0.9, sourceRefs: [{ type: "prompt" }] },
    { id: "cache", type: "cache", label: "Cache", technology: "Redis", confidence: 0.9, sourceRefs: [{ type: "inferred", inferenceNote: "Standard cache layer" }] },
    { id: "queue", type: "queue", label: "Event Bus", technology: "RabbitMQ", confidence: 0.85, sourceRefs: [{ type: "prompt" }] },
    { id: "notif_svc", type: "service", label: "Notification Service", technology: "Python", confidence: 0.8, sourceRefs: [{ type: "prompt" }] },
  ],
  edges: [
    { id: "e1", from: "browser", to: "cdn", label: "HTTPS", protocol: "HTTPS", direction: "forward", confidence: 1.0, sourceRefs: [] },
    { id: "e2", from: "browser", to: "api_gw", label: "REST", protocol: "HTTPS", direction: "forward", confidence: 1.0, sourceRefs: [] },
    { id: "e3", from: "api_gw", to: "order_svc", label: "routes", direction: "forward", confidence: 1.0, sourceRefs: [] },
    { id: "e4", from: "api_gw", to: "product_svc", label: "routes", direction: "forward", confidence: 1.0, sourceRefs: [] },
    { id: "e5", from: "api_gw", to: "user_svc", label: "routes", direction: "forward", confidence: 1.0, sourceRefs: [] },
    { id: "e6", from: "order_svc", to: "order_db", label: "SQL", direction: "bidirectional", confidence: 1.0, sourceRefs: [] },
    { id: "e7", from: "product_svc", to: "product_db", label: "queries", direction: "bidirectional", confidence: 0.95, sourceRefs: [] },
    { id: "e8", from: "order_svc", to: "cache", label: "reads", direction: "bidirectional", confidence: 0.9, sourceRefs: [] },
    { id: "e9", from: "order_svc", to: "queue", label: "publishes events", protocol: "AMQP", direction: "forward", confidence: 0.85, sourceRefs: [] },
    { id: "e10", from: "queue", to: "notif_svc", label: "consumes", protocol: "AMQP", direction: "forward", confidence: 0.85, sourceRefs: [] },
  ],
  groups: [
    { id: "microservices", label: "Microservices", children: ["order_svc", "product_svc", "user_svc"] },
    { id: "data_layer", label: "Data Layer", children: ["order_db", "product_db", "cache"] },
  ],
  annotations: [],
  unresolvedItems: [
    { description: "Payment service", reason: "Payment processing not mentioned in seed prompt" },
  ],
};

const SEED_DSL = {
  ...DEMO_DIAGRAM_DSL,
  nodes: DEMO_DIAGRAM_DSL.nodes.map((n, i) => ({
    ...n,
    position: { x: (i % 4) * 220 + 50, y: Math.floor(i / 4) * 140 + 50 },
    dimensions: { width: 160, height: 60 },
    metadata: {},
  })),
};

async function main() {
  console.log("🌱 Seeding database...");
  await connectMongo();

  // Demo user
  let user = await User.findOne({ email: "demo@diagramforge.dev" });
  if (!user) {
    user = await User.create({ email: "demo@diagramforge.dev" });
  }
  console.log(`✓ User: ${user.email} (${user.id})`);

  // Demo project
  let project = await Project.findOne({ _id: "seed-project-001" });
  if (!project) {
    project = await Project.create({
      _id: "seed-project-001",
      userId: user.id,
      name: "E-Commerce Platform",
      description: "Demo project with sample architecture diagrams",
    });
  } else {
    project.userId = user.id;
    project.name = "E-Commerce Platform";
    project.description = "Demo project with sample architecture diagrams";
    await project.save();
  }
  console.log(`✓ Project: ${project.name}`);

  // Sample diagram
  await DiagramVersion.deleteMany({ diagramId: "seed-diagram-001" });
  await Diagram.deleteOne({ _id: "seed-diagram-001" });

  const diagram = await Diagram.create({
    _id: "seed-diagram-001",
    projectId: project.id,
    title: DEMO_DIAGRAM_DSL.title,
    diagramType: "architecture",
    dslJson: SEED_DSL as object,
    currentVersion: 1,
  });

  await DiagramVersion.create({
    diagramId: diagram.id,
    versionNumber: 1,
    dslJson: SEED_DSL as object,
    changeNote: "Seed data",
  });

  console.log(`✓ Diagram: ${diagram.title} (${diagram.id})`);
  console.log("\n✅ Seed complete.");
  console.log(`\nDemo login: POST /api/auth/demo-login { "email": "demo@diagramforge.dev" }`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectMongo();
  });
