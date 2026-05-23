import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, Plus, Layers, FolderPlus, ChevronDown, BookOpen,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useProjectStore } from "../../store/project.store";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { PromptBox } from "../prompt/PromptBox";
import { FileDropZone } from "../upload/FileDropZone";
import { ProjectModal } from "../project/ProjectModal";
import { projectService } from "../../services/project.service";

export function LeftPanel() {
  const [section, setSection] = useState<"prompt" | "files">("prompt");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const { activeProject, setActiveProject, projects, setProjects } = useProjectStore();
  const { diagramTitle, diagramId } = useDiagramStore();
  const { leftPanelOpen } = useUIStore();
  const navigate = useNavigate();

  // Load projects once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await projectService.list();
        setProjects(res.projects);
        // Auto-select first project if none active
        if (!activeProject && res.projects.length > 0) {
          setActiveProject(res.projects[0]!);
        }
      } catch {
        // not logged in yet — ignore
      }
    };
    void load();
  }, [setProjects, setActiveProject]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!leftPanelOpen) return null;

  return (
    <>
      <div className="w-64 flex-shrink-0 bg-surface-1 border-r border-border flex flex-col">
        {/* Project selector */}
        <div className="px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FolderOpen size={12} className="text-slate-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Project</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Project dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setProjectDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 bg-surface-2 border border-border rounded text-xs text-slate-300 hover:border-border-strong transition-colors"
              >
                <span className="truncate flex-1">
                  {activeProject?.name ?? "No project selected"}
                </span>
                <ChevronDown size={10} className="text-slate-500 flex-shrink-0" />
              </button>

              {projectDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProjectDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-20 w-full bg-surface-1 border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
                    {projects.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No projects yet</p>
                    ) : (
                      projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveProject(p);
                            setProjectDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            activeProject?.id === p.id
                              ? "text-accent bg-accent/5"
                              : "text-slate-300 hover:bg-surface-2"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => {
                          setProjectDropdownOpen(false);
                          setShowProjectModal(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-accent/5 transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={11} /> New Project
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick create project button */}
            <button
              onClick={() => setShowProjectModal(true)}
              className="p-1.5 text-slate-500 hover:text-accent border border-border rounded hover:border-accent/40 transition-colors"
              title="Create new project"
            >
              <FolderPlus size={12} />
            </button>
          </div>

          {/* Current diagram breadcrumb */}
          {diagramId && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
              <Layers size={9} />
              <span className="truncate">{diagramTitle}</span>
              <button
                onClick={() => navigate(`/diagrams/${diagramId}/history`)}
                className="ml-auto text-accent hover:underline flex-shrink-0"
              >
                History
              </button>
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-border">
          {(["prompt", "files"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 py-2 text-xs font-medium transition-all ${
                section === s
                  ? "text-slate-100 border-b-2 border-accent -mb-px"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s === "prompt" ? "Generate" : "From Files"}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto">
          {section === "prompt" ? <PromptBox /> : <FileDropZone />}
        </div>
      </div>

      {/* Project creation modal */}
      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
        />
      )}
    </>
  );
}
