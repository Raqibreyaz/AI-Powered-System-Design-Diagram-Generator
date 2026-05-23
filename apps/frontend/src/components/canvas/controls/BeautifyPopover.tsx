import { useState } from "react";
import { Sparkles, ArrowRight, ArrowDown, Sliders } from "lucide-react";
import { useDiagramStore } from "../../../store/diagram.store";
import { useUIStore } from "../../../store/ui.store";
import { diagramService } from "../../../services/diagram.service";
import { Button } from "../../ui/Button";

export function BeautifyPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"RIGHT" | "DOWN">("RIGHT");
  const [spacing, setSpacing] = useState<"compact" | "balanced" | "spacious">("balanced");

  const { dsl, setDSL } = useDiagramStore();
  const { showToast } = useUIStore();

  const handleApplyLayout = async () => {
    if (!dsl) return;
    setLoading(true);
    try {
      const res = await diagramService.beautify({
        dslJson: dsl,
        options: {
          direction,
          spacing,
        },
      });
      
      // Update store and push into undo history
      setDSL(res.dslJson, true);
      showToast("Layout optimized successfully!", "success");
      setOpen(false);
    } catch (err: any) {
      showToast(err?.message || "Layout optimization failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!dsl) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        title="Beautify Diagram"
        className={open ? "text-accent bg-surface-2" : ""}
      >
        <Sparkles size={13} className={open ? "animate-pulse" : ""} />
        <span className="text-xs">Beautify</span>
      </Button>

      {open && (
        <>
          {/* Backdrop layer to click out */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => !loading && setOpen(false)} 
          />
          
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-surface-1/95 backdrop-blur-md border border-border-strong rounded-lg shadow-2xl w-64 p-3 animate-fade-in">
            <div className="flex items-center gap-1.5 border-b border-border pb-2 mb-3">
              <Sliders size={12} className="text-accent" />
              <h3 className="text-xs font-semibold text-slate-200">Layout Optimizer</h3>
            </div>

            {/* Direction Selection */}
            <div className="mb-3">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Flow Direction
              </span>
              <div className="grid grid-cols-2 gap-1 bg-surface-2 p-0.5 rounded border border-border/50">
                <button
                  type="button"
                  onClick={() => setDirection("RIGHT")}
                  disabled={loading}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 text-xs rounded transition-all ${
                    direction === "RIGHT"
                      ? "bg-surface-3 border border-border text-slate-100 font-medium shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ArrowRight size={11} />
                  <span>Horizontal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("DOWN")}
                  disabled={loading}
                  className={`flex items-center justify-center gap-1.5 py-1 px-2 text-xs rounded transition-all ${
                    direction === "DOWN"
                      ? "bg-surface-3 border border-border text-slate-100 font-medium shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ArrowDown size={11} />
                  <span>Vertical</span>
                </button>
              </div>
            </div>

            {/* Spacing options */}
            <div className="mb-4">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Spacing Layout
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(["compact", "balanced", "spacious"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpacing(s)}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 border rounded transition-all hover:bg-surface-2/50 ${
                      spacing === s
                        ? "border-accent bg-accent/5 text-accent font-medium"
                        : "border-border text-slate-400"
                    }`}
                  >
                    <span className="text-[10px] capitalize">{s}</span>
                    <span className="text-[8px] text-slate-500">
                      {s === "compact" ? "40px" : s === "balanced" ? "60px" : "100px"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Actions */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleApplyLayout()}
              loading={loading}
              className="w-full text-xs font-semibold py-1 bg-gradient-to-r from-accent to-indigo-600 hover:from-accent-hover hover:to-indigo-500 shadow-md shadow-accent/15"
            >
              <Sparkles size={11} />
              <span>Optimize Layout</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
