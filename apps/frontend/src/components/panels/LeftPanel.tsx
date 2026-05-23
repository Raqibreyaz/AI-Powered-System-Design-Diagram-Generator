import { FolderOpen, Plus, Layers, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useProjectStore } from "../../store/project.store";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { PromptBox } from "../prompt/PromptBox";
import { FileDropZone } from "../upload/FileDropZone";

export function LeftPanel() {
  const [section, setSection] = useState<"prompt" | "files">("prompt");
  const { activeProject } = useProjectStore();
  const { diagramTitle, diagramId } = useDiagramStore();
  const { leftPanelOpen } = useUIStore();
  const navigate = useNavigate();

  if (!leftPanelOpen) return null;

  return (
    <div className="w-64 flex-shrink-0 bg-surface-1 border-r border-border flex flex-col">
      {/* Project header */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen size={13} className="text-slate-500" />
          <span className="text-xs font-medium text-slate-300 truncate">
            {activeProject?.name ?? "No project"}
          </span>
        </div>
        {diagramId && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Layers size={10} />
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
            className={`flex-1 py-2 text-xs font-medium transition-all capitalize ${
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
  );
}
