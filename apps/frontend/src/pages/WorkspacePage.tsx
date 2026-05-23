/**
 * WorkspacePage — the main diagram editor.
 * Layout: Left panel | Canvas | Right panel (conditional)
 *         Bottom status bar
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { Layers, Settings, PanelLeftOpen, PanelLeftClose, BookOpen, Keyboard } from "lucide-react";
import { DiagramCanvas } from "../components/canvas/DiagramCanvas";
import { LeftPanel } from "../components/panels/LeftPanel";
import { RightPanel } from "../components/panels/RightPanel";
import { BottomPanel } from "../components/panels/BottomPanel";
import { Button } from "../components/ui/Button";
import { DiagramBrowser } from "../components/diagram/DiagramBrowser";
import { Toast } from "../components/ui/Toast";
import { useDiagramStore } from "../store/diagram.store";
import { useUIStore } from "../store/ui.store";
import { useProjectStore } from "../store/project.store";
import { diagramService } from "../services/diagram.service";
import { projectService } from "../services/project.service";

export default function WorkspacePage() {
  const { diagramId } = useParams<{ diagramId?: string }>();
  const navigate = useNavigate();
  const { loadDiagram, diagramTitle, reset } = useDiagramStore();
  const { leftPanelOpen, toggleLeftPanel, toast, showToast } = useUIStore();
  const { currentUser, setUser } = useProjectStore();

  const [showDiagramBrowser, setShowDiagramBrowser] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

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
          // silent — UI still usable, will show 401 on actions
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
        <div className="flex items-center gap-1.5">
          {/* Sidebar toggle */}
          <button
            onClick={toggleLeftPanel}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-2 rounded transition-all"
            title={leftPanelOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {leftPanelOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>

          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Layers size={12} className="text-accent" />
            </div>
            <span className="text-sm font-semibold text-slate-200 tracking-tight">Diagram Forge</span>
          </button>

          {diagramTitle && (
            <>
              <span className="text-slate-600 text-sm">/</span>
              <span className="text-sm text-slate-400 truncate max-w-[200px]">{diagramTitle}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {currentUser && (
            <span className="text-xs text-slate-600 mr-1 hidden sm:block">{currentUser.email}</span>
          )}

          {/* My Diagrams browser */}
          <button
            onClick={() => setShowDiagramBrowser((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all ${
              showDiagramBrowser
                ? "bg-accent/10 text-accent border border-accent/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-surface-2"
            }`}
            title="Browse all diagrams"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">Diagrams</span>
          </button>

          {/* Keyboard shortcuts help */}
          <button
            onClick={() => setShowKeyboardHelp((v) => !v)}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-surface-2 rounded transition-all"
            title="Keyboard shortcuts"
          >
            <Keyboard size={13} />
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-surface-2 rounded transition-all"
            title="Settings"
          >
            <Settings size={13} />
          </button>
        </div>
      </header>

      {/* Keyboard shortcuts popover */}
      {showKeyboardHelp && (
        <div
          className="absolute top-12 right-2 z-30 bg-surface-1 border border-border rounded-xl shadow-xl p-4 w-72 animate-fade-in"
          onMouseLeave={() => setShowKeyboardHelp(false)}
        >
          <h3 className="text-xs font-semibold text-slate-300 mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-1.5">
            {[
              ["⌘/Ctrl + Enter", "Generate diagram (in prompt)"],
              ["Delete / Backspace", "Delete selected nodes/edges"],
              ["Shift + click", "Multi-select nodes"],
              ["⌘/Ctrl + Z", "Undo"],
              ["⌘/Ctrl + Shift + Z", "Redo"],
              ["Right-click canvas", "Add node / delete selected"],
              ["Scroll", "Zoom in/out"],
            ].map(([key, action]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <kbd className="text-[10px] bg-surface-2 border border-border rounded px-1.5 py-0.5 font-mono text-slate-300 flex-shrink-0">
                  {key}
                </kbd>
                <span className="text-[10px] text-slate-500 text-right">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Diagram browser drawer */}
      {showDiagramBrowser && (
        <DiagramBrowser onClose={() => setShowDiagramBrowser(false)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
