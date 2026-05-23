/**
 * RefineSelectionPanel — appears when one or more canvas nodes are selected.
 * Sends a prompt to regenerate/refine only the selected nodes/edges.
 * Uses POST /api/diagrams/:id/regenerate-selection
 */

import { useState } from "react";
import { Wand2, Sparkles, X } from "lucide-react";
import { Button } from "../ui/Button";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { diagramService } from "../../services/diagram.service";

export function RefineSelectionPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    selectedNodeIds, selectedEdgeIds, diagramId, dsl,
    setDSL, setGenerationError, onSelectionChange, nodes, edges,
  } = useDiagramStore();
  const { showToast } = useUIStore();

  // Only show when there's an active diagram and nodes are selected
  if (!diagramId || !dsl || selectedNodeIds.length === 0) return null;

  const selectedLabels = selectedNodeIds
    .map((id) => dsl.nodes.find((n) => n.id === id)?.label ?? id)
    .join(", ");

  const handleRefine = async () => {
    if (!prompt.trim() || !diagramId || loading) return;
    setLoading(true);

    try {
      const res = await diagramService.regenerateSelection(diagramId, {
        selectedNodeIds,
        selectedEdgeIds,
        prompt: prompt.trim(),
      });

      setDSL(res.diagram.dslJson, true);
      setPrompt("");
      // Clear selection
      onSelectionChange({ nodes: [], edges: [] });
      showToast("Selection refined ✓", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refinement failed";
      setGenerationError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 w-[480px] max-w-[calc(100vw-2rem)] animate-slide-up">
      <div className="bg-surface-1 border border-accent/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-accent/5 border-b border-accent/20">
          <div className="flex items-center gap-1.5 text-xs text-accent">
            <Sparkles size={12} />
            <span className="font-medium">Refine Selection</span>
            <span className="text-slate-500 font-normal">
              — {selectedNodeIds.length} node{selectedNodeIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <button
            onClick={() => onSelectionChange({ nodes: [], edges: [] })}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {/* Selected nodes display */}
        <div className="px-3 py-1.5 flex flex-wrap gap-1">
          {selectedNodeIds.map((id) => {
            const node = dsl.nodes.find((n) => n.id === id);
            return (
              <span
                key={id}
                className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20"
              >
                {node?.label ?? id}
              </span>
            );
          })}
          {selectedEdgeIds.map((id) => (
            <span
              key={id}
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-slate-400 border border-border"
            >
              edge: {id}
            </span>
          ))}
        </div>

        {/* Prompt input */}
        <div className="flex gap-2 px-3 pb-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleRefine()}
            placeholder={`How should I change ${selectedLabels.split(",")[0]}…?`}
            className="flex-1 bg-surface-2 border border-border rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/60 transition-colors"
            disabled={loading}
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleRefine()}
            loading={loading}
            disabled={!prompt.trim()}
          >
            <Wand2 size={13} />
            Refine
          </Button>
        </div>
      </div>
    </div>
  );
}
