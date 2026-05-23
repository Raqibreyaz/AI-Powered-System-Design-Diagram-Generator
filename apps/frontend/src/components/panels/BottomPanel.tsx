import { useDiagramStore } from "../../store/diagram.store";
import { Spinner } from "../ui/Spinner";

export function BottomPanel() {
  const { isGenerating, generationError, dsl } = useDiagramStore();

  return (
    <div className="h-8 flex items-center px-3 gap-3 bg-surface-1 border-t border-border text-xs text-slate-500 select-none">
      {isGenerating ? (
        <>
          <Spinner size={11} className="text-accent" />
          <span className="text-accent animate-pulse-subtle">Generating diagram…</span>
        </>
      ) : generationError ? (
        <span className="text-danger">⚠ {generationError}</span>
      ) : dsl ? (
        <>
          <span className="text-slate-600">v{}</span>
          <span>{dsl.nodes.length} nodes · {dsl.edges.length} edges</span>
          <span className="ml-auto font-mono text-slate-600">
            {dsl.diagramType} · confidence {Math.round(dsl.confidence * 100)}%
          </span>
        </>
      ) : (
        <span className="text-slate-600">Ready</span>
      )}
    </div>
  );
}
