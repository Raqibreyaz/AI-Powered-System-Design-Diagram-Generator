import { useCallback, useState } from "react";
import { Upload, File, X, Wand2 } from "lucide-react";
import { Button } from "../ui/Button";
import { useProjectStore } from "../../store/project.store";
import { projectService } from "../../services/project.service";
import { diagramService } from "../../services/diagram.service";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";

const ALLOWED = [".yaml", ".yml", ".json", ".env", "dockerfile", ".txt"];

export function FileDropZone() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);

  const { activeProject } = useProjectStore();
  const { loadDiagram, setGenerating, setGenerationError, setUnresolvedItems, isGenerating } = useDiagramStore();
  const { showToast } = useUIStore();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter((f) =>
      ALLOWED.some((ext) => f.name.toLowerCase().endsWith(ext) || f.name.toLowerCase().includes("dockerfile"))
    );
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !existingNames.has(f.name))];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUploadAndGenerate = async () => {
    if (!activeProject) {
      showToast("Create a project first to upload files", "error");
      return;
    }
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const res = await projectService.uploadFiles(activeProject.id, files);
      const ids = (res.files as Array<{ id: string }>).map((f) => f.id);
      setUploadedIds(ids);
      showToast(`${ids.length} file(s) uploaded`, "success");

      setGenerating(true);
      const diagram = await diagramService.generateFromFiles({
        projectId: activeProject.id,
        fileIds: ids,
        diagramType: "architecture",
      });

      loadDiagram(diagram.diagram.id, diagram.diagram.dslJson, {
        title: diagram.diagram.title,
        version: diagram.diagram.currentVersion,
        diagramType: diagram.diagram.diagramType,
      });
      setUnresolvedItems(diagram.unresolvedItems);
      showToast("Diagram generated from files", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload/generation failed";
      setGenerationError(msg);
      showToast(msg, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-3 space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ALLOWED.join(",");
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files) addFiles(target.files);
          };
          input.click();
        }}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-border-strong"
        }`}
      >
        <Upload size={20} className="mx-auto mb-2 text-slate-500" />
        <p className="text-xs text-slate-400">Drop files here or click to browse</p>
        <p className="text-[10px] text-slate-600 mt-1">.yaml · .yml · .json · Dockerfile</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.name} className="flex items-center gap-2 text-xs bg-surface-2 rounded px-2 py-1.5">
              <File size={11} className="text-slate-500 flex-shrink-0" />
              <span className="truncate text-slate-300 flex-1">{f.name}</span>
              <span className="text-slate-500 flex-shrink-0">{Math.round(f.size / 1024)}k</span>
              <button
                onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                className="text-slate-600 hover:text-danger transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          loading={isUploading || isGenerating}
          onClick={() => void handleUploadAndGenerate()}
          disabled={!activeProject}
        >
          <Wand2 size={13} />
          Upload &amp; Generate
        </Button>
      )}

      {!activeProject && files.length > 0 && (
        <p className="text-[10px] text-warning text-center">
          Create a project first to upload files
        </p>
      )}
    </div>
  );
}
