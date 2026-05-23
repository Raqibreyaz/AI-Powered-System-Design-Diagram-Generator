import { useState, type RefObject } from "react";
import { Download, ChevronDown, FileJson, Image, Code } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { diagramService } from "../../services/diagram.service";
import { Button } from "../ui/Button";

interface ExportMenuProps {
  canvasRef: RefObject<HTMLDivElement>;
}

export function ExportMenu({ canvasRef }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const { dsl, diagramId, diagramTitle } = useDiagramStore();
  const { showToast } = useUIStore();

  const filename = diagramTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const exportJSON = () => {
    if (!dsl) return;
    const blob = new Blob([JSON.stringify(dsl, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${filename}.diagram-forge.json`);
    showToast("Exported as JSON", "success");
    setOpen(false);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.querySelector(".react-flow__renderer") as HTMLElement;
    if (!canvas) return;
    try {
      const dataUrl = await toPng(canvas, { backgroundColor: "#0f1117", quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
      showToast("Exported as PNG", "success");
    } catch {
      showToast("PNG export failed", "error");
    }
    setOpen(false);
  };

  const exportSVG = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.querySelector(".react-flow__renderer") as HTMLElement;
    if (!canvas) return;
    try {
      const svgStr = await toSvg(canvas, { backgroundColor: "#0f1117" });
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      downloadBlob(blob, `${filename}.svg`);
      showToast("Exported as SVG", "success");
    } catch {
      showToast("SVG export failed", "error");
    }
    setOpen(false);
  };

  if (!dsl) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        title="Export"
      >
        <Download size={13} />
        <ChevronDown size={10} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-surface-1 border border-border rounded-lg shadow-xl min-w-[140px] py-1 animate-fade-in">
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2 transition-colors"
            >
              <FileJson size={13} className="text-slate-500" /> Export JSON
            </button>
            <button
              onClick={() => void exportPNG()}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2 transition-colors"
            >
              <Image size={13} className="text-slate-500" /> Export PNG
            </button>
            <button
              onClick={() => void exportSVG()}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-2 transition-colors"
            >
              <Code size={13} className="text-slate-500" /> Export SVG
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
