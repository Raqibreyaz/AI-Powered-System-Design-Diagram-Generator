/**
 * DiagramBrowser — slide-out drawer listing all user's diagrams.
 * Shows diagram title, type, version, date. Click to open in workspace.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Layers, Search, Trash2, Clock, ChevronRight, RefreshCw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { diagramService, type DiagramSummary } from "../../services/diagram.service";
import { useUIStore } from "../../store/ui.store";
import { useDiagramStore } from "../../store/diagram.store";

const TYPE_COLORS: Record<string, string> = {
  architecture: "#6366f1",
  flowchart: "#10b981",
  sequence: "#f59e0b",
};

interface DiagramBrowserProps {
  onClose: () => void;
}

export function DiagramBrowser({ onClose }: DiagramBrowserProps) {
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { diagramId: activeDiagramId } = useDiagramStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await diagramService.list({ limit: 50 });
      setDiagrams(res.diagrams);
      setTotal(res.total);
    } catch {
      showToast("Failed to load diagrams", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = (id: string) => {
    navigate(`/workspace/${id}`);
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setDeleting(id);
    try {
      await diagramService.delete(id);
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      setTotal((prev) => prev - 1);
      showToast("Diagram deleted", "success");
    } catch {
      showToast("Failed to delete diagram", "error");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = diagrams.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.diagramType.includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface-1 border-l border-border flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-slate-100">
              My Diagrams
              {total > 0 && (
                <span className="ml-1.5 text-xs text-slate-500 font-normal">({total})</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void load()}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search diagrams…"
              className="w-full bg-surface-2 border border-border rounded px-2.5 py-1.5 pl-7 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size={18} className="text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Layers size={24} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? "No matching diagrams" : "No diagrams yet"}
              </p>
              {!search && (
                <p className="text-xs mt-1 text-slate-600">Generate one from the workspace</p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {filtered.map((diagram) => {
                const isActive = diagram.id === activeDiagramId;
                const color = TYPE_COLORS[diagram.diagramType] ?? "#6b7280";

                return (
                  <button
                    key={diagram.id}
                    onClick={() => handleOpen(diagram.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group relative ${
                      isActive
                        ? "bg-accent/10 border border-accent/30"
                        : "hover:bg-surface-2 border border-transparent hover:border-border"
                    }`}
                  >
                    {/* Type color bar */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-medium leading-tight break-words ${
                          isActive ? "text-accent" : "text-slate-200"
                        }`}>
                          {diagram.title}
                        </span>
                        <button
                          onClick={(e) => void handleDelete(e, diagram.id, diagram.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-danger flex-shrink-0"
                          title="Delete"
                        >
                          {deleting === diagram.id ? (
                            <Spinner size={11} />
                          ) : (
                            <Trash2 size={11} />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                          style={{
                            backgroundColor: `${color}22`,
                            color,
                            border: `1px solid ${color}44`,
                          }}
                        >
                          {diagram.diagramType}
                        </span>
                        <span className="text-[10px] text-slate-600">v{diagram.currentVersion}</span>
                        <span className="text-[10px] text-slate-600 ml-auto flex items-center gap-0.5">
                          <Clock size={9} />
                          {formatRelative(diagram.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <ChevronRight
                        size={12}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-accent"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
