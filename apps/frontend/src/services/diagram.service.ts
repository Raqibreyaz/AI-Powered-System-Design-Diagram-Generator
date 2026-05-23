import { api } from "./api";
import type {
  GenerateFromPromptRequest,
  GenerateFromFilesRequest,
  RegenerateSelectionRequest,
  PatchDiagramRequest,
  GenerateDiagramResponse,
  Diagram,
  DiagramVersion,
} from "@diagram-forge/shared";

export interface DiagramSummary {
  id: string;
  title: string;
  diagramType: string;
  currentVersion: number;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const diagramService = {
  generateFromPrompt: (body: GenerateFromPromptRequest) =>
    api.post<GenerateDiagramResponse>("/diagrams/generate-from-prompt", body),

  generateFromFiles: (body: GenerateFromFilesRequest) =>
    api.post<GenerateDiagramResponse>("/diagrams/generate-from-files", body),

  regenerateSelection: (id: string, body: RegenerateSelectionRequest) =>
    api.post<{ diagram: Diagram }>(`/diagrams/${id}/regenerate-selection`, body),

  list: (params?: { projectId?: string; limit?: number; skip?: number }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", params.projectId);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.skip != null) qs.set("skip", String(params.skip));
    const query = qs.toString();
    return api.get<{ diagrams: DiagramSummary[]; total: number }>(
      `/diagrams${query ? `?${query}` : ""}`
    );
  },

  get: (id: string) => api.get<{ diagram: Diagram }>(`/diagrams/${id}`),

  patch: (id: string, body: PatchDiagramRequest) =>
    api.patch<{ diagram: Diagram }>(`/diagrams/${id}`, body),

  delete: (id: string) => api.delete<void>(`/diagrams/${id}`),

  listVersions: (id: string) =>
    api.get<{ versions: DiagramVersion[] }>(`/diagrams/${id}/versions`),

  restoreVersion: (id: string, versionId: string) =>
    api.post<{ diagram: Diagram }>(`/diagrams/${id}/restore-version`, { versionId }),

  exportJson: (id: string) =>
    api.post<unknown>(`/diagrams/${id}/export`, { format: "json" }),

  exportSvg: (id: string, svgContent: string) =>
    api.post<unknown>(`/diagrams/${id}/export`, { format: "svg", svgContent }),
};

