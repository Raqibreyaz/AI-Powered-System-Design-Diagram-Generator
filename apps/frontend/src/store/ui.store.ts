import { create } from "zustand";

export interface UIState {
  // Panel visibility
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  promptOpen: boolean;

  // Active tab in right panel
  rightPanelTab: "inspector" | "evidence" | "unresolved";

  // Notification
  toast: { message: string; type: "success" | "error" | "info" } | null;

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  togglePrompt: () => void;
  setRightPanelTab: (tab: UIState["rightPanelTab"]) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: false,
  bottomPanelOpen: false,
  promptOpen: true,
  rightPanelTab: "inspector",
  toast: null,

  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  togglePrompt: () => set((s) => ({ promptOpen: !s.promptOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  showToast: (message, type = "info") => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },

  clearToast: () => set({ toast: null }),
}));
