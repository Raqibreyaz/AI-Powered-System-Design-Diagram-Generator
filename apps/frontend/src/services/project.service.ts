import { api, setToken } from "./api";
import type { CreateProjectRequest, Project } from "@diagram-forge/shared";

export const projectService = {
  login: async (email: string): Promise<{ token: string; user: { id: string; email: string } }> => {
    const result = await api.post<{ token: string; user: { id: string; email: string } }>(
      "/auth/demo-login",
      { email }
    );
    setToken(result.token);
    return result;
  },

  me: () => api.get<{ user: { id: string; email: string } }>("/auth/me"),

  create: (body: CreateProjectRequest) =>
    api.post<{ project: Project }>("/projects", body),

  list: () => api.get<{ projects: Project[] }>("/projects"),

  get: (id: string) => api.get<{ project: Project & { diagrams: unknown[]; files: unknown[] } }>(`/projects/${id}`),

  delete: (id: string) => api.delete<void>(`/projects/${id}`),

  uploadFiles: (projectId: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file, file.name);
    }
    return api.upload<{ files: unknown[] }>(`/projects/${projectId}/files`, formData);
  },

  listFiles: (projectId: string) =>
    api.get<{ files: unknown[] }>(`/projects/${projectId}/files`),
};
