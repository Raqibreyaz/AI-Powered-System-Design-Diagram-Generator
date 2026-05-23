/**
 * ProjectModal — create a new project.
 * Simple modal dialog with name + optional description.
 */

import { useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { projectService } from "../../services/project.service";
import { useProjectStore } from "../../store/project.store";
import { useUIStore } from "../../store/ui.store";

interface ProjectModalProps {
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function ProjectModal({ onClose, onCreated }: ProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setActiveProject, setProjects, projects } = useProjectStore();
  const { showToast } = useUIStore();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await projectService.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Update store
      setProjects([...projects, res.project]);
      setActiveProject(res.project);

      showToast(`Project "${res.project.name}" created`, "success");
      onCreated?.(res.project.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-surface-1 border border-border rounded-xl shadow-2xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <FolderPlus size={14} className="text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Project Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              placeholder="e.g. E-Commerce Platform"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-accent/60 focus:bg-surface-3 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project…"
              rows={3}
              className="w-full resize-none bg-surface-2 border border-border rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-accent/60 focus:bg-surface-3 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleCreate()}
            loading={loading}
            disabled={!name.trim()}
          >
            <FolderPlus size={13} />
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
