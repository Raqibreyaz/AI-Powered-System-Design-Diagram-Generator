/**
 * Canvas toolbar — undo, redo, fit view, zoom, export, and save.
 */

import { useReactFlow } from "@xyflow/react";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Save } from "lucide-react";
import { useDiagramStore } from "../../../store/diagram.store";
import { useUIStore } from "../../../store/ui.store";
import { diagramService } from "../../../services/diagram.service";
import { Button } from "../../ui/Button";
import { ExportMenu } from "../../export/ExportMenu";
import { BeautifyPopover } from "./BeautifyPopover";
import type { RefObject } from "react";

interface CanvasToolBarProps {
  canvasRef: RefObject<HTMLDivElement>;
}

export function CanvasToolBar({ canvasRef }: CanvasToolBarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { undo, redo, canUndo, canRedo, diagramId, dsl, isGenerating } = useDiagramStore();
  const { showToast } = useUIStore();

  const handleSave = async () => {
    if (!diagramId || !dsl) return;
    try {
      await diagramService.patch(diagramId, { dslJson: dsl });
      showToast("Diagram saved", "success");
    } catch {
      showToast("Failed to save", "error");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-surface-1 border border-border rounded-lg p-1 shadow-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={13} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={!canRedo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={13} />
      </Button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <Button variant="ghost" size="sm" onClick={() => zoomIn()} title="Zoom in">
        <ZoomIn size={13} />
      </Button>

      <Button variant="ghost" size="sm" onClick={() => zoomOut()} title="Zoom out">
        <ZoomOut size={13} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        title="Fit view"
      >
        <Maximize2 size={13} />
      </Button>

      <div className="w-px h-4 bg-border mx-0.5" />

      <ExportMenu canvasRef={canvasRef} />

      <BeautifyPopover />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => void handleSave()}
        disabled={!diagramId || isGenerating}
        title="Save (Ctrl+S)"
      >
        <Save size={13} />
        <span className="text-xs">Save</span>
      </Button>
    </div>
  );
}

