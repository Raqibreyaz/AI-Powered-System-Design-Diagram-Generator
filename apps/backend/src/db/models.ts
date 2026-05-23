import mongoose, { Schema, model } from "mongoose";
import { generateId } from "../utils/id.js";

// Enable global JSON transform options to map _id to id and remove internal fields
mongoose.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret["id"] = ret["_id"];
    delete ret["_id"];
    return ret;
  },
});

mongoose.set("toObject", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, any>) => {
    ret["id"] = ret["_id"];
    delete ret["_id"];
    return ret;
  },
});

// ─── User ─────────────────────────────────────────────────────────────────────

export interface IUser {
  _id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => generateId() },
    email: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

export const User = model<IUser>("User", UserSchema);

// ─── Project ──────────────────────────────────────────────────────────────────

export interface IProject {
  _id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    _id: { type: String, default: () => generateId() },
    userId: { type: String, required: true, ref: "User", index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

export const Project = model<IProject>("Project", ProjectSchema);

// ─── UploadedFile ─────────────────────────────────────────────────────────────

export interface IUploadedFile {
  _id: string;
  projectId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  parsedGraph: any;
  createdAt: Date;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    _id: { type: String, default: () => generateId() },
    projectId: { type: String, required: true, ref: "Project", index: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storagePath: { type: String, required: true },
    parsedGraph: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "uploaded_files",
  }
);

export const UploadedFile = model<IUploadedFile>("UploadedFile", UploadedFileSchema);

// ─── Diagram ──────────────────────────────────────────────────────────────────

export interface IDiagram {
  _id: string;
  projectId: string | null;
  title: string;
  diagramType: "architecture" | "flowchart" | "sequence";
  dslJson: any;
  viewportJson: any;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const DiagramSchema = new Schema<IDiagram>(
  {
    _id: { type: String, default: () => generateId() },
    projectId: { type: String, ref: "Project", index: true, default: null },
    title: { type: String, required: true },
    diagramType: {
      type: String,
      required: true,
      enum: ["architecture", "flowchart", "sequence"],
    },
    dslJson: { type: Schema.Types.Mixed, required: true },
    viewportJson: { type: Schema.Types.Mixed, default: null },
    currentVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    collection: "diagrams",
  }
);

export const Diagram = model<IDiagram>("Diagram", DiagramSchema);

// ─── DiagramVersion ───────────────────────────────────────────────────────────

export interface IDiagramVersion {
  _id: string;
  diagramId: string;
  versionNumber: number;
  dslJson: any;
  viewportJson: any;
  changeNote: string | null;
  createdAt: Date;
}

const DiagramVersionSchema = new Schema<IDiagramVersion>(
  {
    _id: { type: String, default: () => generateId() },
    diagramId: { type: String, required: true, ref: "Diagram", index: true },
    versionNumber: { type: Number, required: true },
    dslJson: { type: Schema.Types.Mixed, required: true },
    viewportJson: { type: Schema.Types.Mixed, default: null },
    changeNote: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "diagram_versions",
  }
);

// Compound index for uniqueness of versionNumber per diagram
DiagramVersionSchema.index({ diagramId: 1, versionNumber: 1 }, { unique: true });

export const DiagramVersion = model<IDiagramVersion>("DiagramVersion", DiagramVersionSchema);

// ─── GenerationJob ────────────────────────────────────────────────────────────

export interface IGenerationJob {
  _id: string;
  diagramId: string | null;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  inputType: string;
  inputPayload: any;
  provider: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

const GenerationJobSchema = new Schema<IGenerationJob>(
  {
    _id: { type: String, default: () => generateId() },
    diagramId: { type: String, ref: "Diagram", index: true, default: null },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    inputType: { type: String, required: true },
    inputPayload: { type: Schema.Types.Mixed, required: true },
    provider: { type: String, default: null },
    errorMessage: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "generation_jobs",
  }
);

export const GenerationJob = model<IGenerationJob>("GenerationJob", GenerationJobSchema);

// ─── EvidenceReference ────────────────────────────────────────────────────────

export interface IEvidenceReference {
  _id: string;
  diagramId: string;
  nodeOrEdgeId: string;
  sourceFileId: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  snippet: string | null;
  inferenceNote: string | null;
}

const EvidenceReferenceSchema = new Schema<IEvidenceReference>(
  {
    _id: { type: String, default: () => generateId() },
    diagramId: { type: String, required: true, ref: "Diagram", index: true },
    nodeOrEdgeId: { type: String, required: true, index: true },
    sourceFileId: { type: String, ref: "UploadedFile", default: null },
    lineStart: { type: Number, default: null },
    lineEnd: { type: Number, default: null },
    snippet: { type: String, default: null },
    inferenceNote: { type: String, default: null },
  },
  {
    timestamps: false,
    collection: "evidence_references",
  }
);

export const EvidenceReference = model<IEvidenceReference>(
  "EvidenceReference",
  EvidenceReferenceSchema
);
