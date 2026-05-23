/**
 * WorkspacePage — the main diagram editor.
 * Layout: Left panel | Canvas | Right panel (conditional)
 *         Bottom status bar
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { Layers, Settings, LogIn, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { DiagramCanvas } from "../components/canvas/DiagramCanvas";
import { LeftPanel } from "../components/panels/LeftPanel";
import { RightPanel } from "../components/panels/RightPanel";
import { BottomPanel } from "../components/panels/BottomPanel";
import { Button } from "../components/ui/Button";
import { useDiagramStore } from "../store/diagram.store";
import { useUIStore } from "../store/ui.store";
import { useProjectStore } from "../store/project.store";
import { diagramService } from "../services/diagram.service";
import { projectService } from "../services/project.service";
import { Toast } from "../components/ui/Toast";

export default function WorkspacePage() {
  const { diagramId } = useParams<{ diagramId?: string }>();
  const navigate = useNavigate();
  const { loadDiagram, diagramTitle } = useDiagramStore();
  const { leftPanelOpen, toggleLeftPanel, toast, showToast } = useUIStore();
  const { currentUser, setUser } = useProjectStore();

  // Auto-login demo user if no token
  useEffect(() => {
    const init = async () => {
      try {
        const me = await projectService.me();
        setUser(me.user);
      } catch {
        // Demo auto-login
        try {
          const res = await projectService.login("demo@diagramforge.dev");
          setUser(res.user);
        } catch {
          // silent
        }
      }
    };
    void init();
  }, [setUser]);

  // Load existing diagram if navigated with an ID
  useEffect(() => {
    if (!diagramId) {
      // Check if there's a starter prompt from the landing page
      const starterPrompt = sessionStorage.getItem("df_starter_prompt");
      if (starterPrompt) {
        sessionStorage.removeItem("df_starter_prompt");
        // The PromptBox will be pre-filled — inject via a custom event for simplicity
        window.dispatchEvent(new CustomEvent("df:starter-prompt", { detail: starterPrompt }));
      }
      return;
    }

    const load = async () => {
      try {
        const res = await diagramService.get(diagramId);
        loadDiagram(res.diagram.id, res.diagram.dslJson, {
          title: res.diagram.title,
          version: res.diagram.currentVersion,
          diagramType: res.diagram.diagramType,
        });
      } catch {
        showToast("Failed to load diagram", "error");
      }
    };
    void load();
  }, [diagramId, loadDiagram, showToast]);

  return (
    <div className="h-screen flex flex-col bg-surface text-slate-100 font-sans overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-3 py-2 bg-surface-1 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftPanel}
            className="text-slate-400 hover:text-slate-200 p-1"
            title={leftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {leftPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </Button>

          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Layers size={12} className="text-accent" />
            </div>
            <span className="text-sm font-semibold text-slate-200 tracking-tight">Diagram Forge</span>
          </button>
          {diagramTitle && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-sm text-slate-400 truncate max-w-[200px]">{diagramTitle}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {currentUser && (
            <span className="text-xs text-slate-500 mr-2">{currentUser.email}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            <Settings size={13} />
          </Button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />

        <div className="flex-1 relative overflow-hidden">
          <ReactFlowProvider>
            <DiagramCanvas />
          </ReactFlowProvider>
        </div>

        <RightPanel />
      </div>

      <BottomPanel />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
