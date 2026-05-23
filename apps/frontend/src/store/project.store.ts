import { create } from "zustand";
import type { Project } from "@diagram-forge/shared";

export interface ProjectState {
  currentUser: { id: string; email: string } | null;
  projects: Project[];
  activeProject: (Project & { diagrams?: unknown[]; files?: unknown[] }) | null;

  setUser: (user: { id: string; email: string } | null) => void;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: ProjectState["activeProject"]) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentUser: null,
  projects: [],
  activeProject: null,

  setUser: (user) => set({ currentUser: user }),
  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  clearProject: () => set({ activeProject: null }),
}));
