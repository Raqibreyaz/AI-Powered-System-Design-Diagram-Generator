/**
 * PromptBox — the primary AI generation input.
 * Handles prompt text, diagram type selector, complexity selector,
 * and invokes the generate-from-prompt flow.
 */

import { useState, useEffect } from "react";
import { Wand2, Info, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { useProjectStore } from "../../store/project.store";
import { diagramService } from "../../services/diagram.service";
import type { DiagramType } from "@diagram-forge/shared";

const SAMPLE_PROMPTS = [
  "Scalable LMS video transcoding pipeline with ECS, S3, CDN, and monitoring",
  "OAuth 2.0 with PKCE and OIDC authorization code flow",
  "Sequence diagram for OIDC discovery and user login",
  "Microservices e-commerce platform with API gateway, order, product, and payment services",
  "Real-time chat system with WebSockets, Redis pub/sub, and PostgreSQL",
  "CI/CD pipeline with GitHub Actions, Docker, and Kubernetes",
];

const DIAGRAM_TYPES: { value: DiagramType; label: string; description: string }[] = [
  { value: "architecture", label: "Architecture", description: "System components and their connections" },
  { value: "flowchart", label: "Flowchart", description: "Process flow and decision trees" },
  { value: "sequence", label: "Sequence", description: "Time-ordered interactions between actors" },
];

type Complexity = "simple" | "medium" | "detailed";

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [diagramType, setDiagramType] = useState<DiagramType>("architecture");
  const [complexity, setComplexity] = useState<Complexity>("medium");

  const navigate = useNavigate();
  const { setGenerating, setGenerationError, loadDiagram, setUnresolvedItems, isGenerating, dsl, diagramId } = useDiagramStore();
  const { showToast } = useUIStore();
  const { activeProject } = useProjectStore();

  // Listen for starter prompt injected from LandingPage via sessionStorage event
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      setPrompt(e.detail);
    };
    window.addEventListener("df:starter-prompt", handler as EventListener);
    return () => window.removeEventListener("df:starter-prompt", handler as EventListener);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setGenerating(true);

    try {
      const res = await diagramService.generateFromPrompt({
        prompt: prompt.trim(),
        diagramType,
        complexity,
        projectId: activeProject?.id,
      });

      loadDiagram(res.diagram.id, res.diagram.dslJson, {
        title: res.diagram.title,
        version: res.diagram.currentVersion,
        diagramType: res.diagram.diagramType,
      });

      setUnresolvedItems(res.unresolvedItems);

      // Update URL so the diagram persists on reload
      navigate(`/workspace/${res.diagram.id}`, { replace: true });

      if (res.unresolvedItems.length > 0) {
        showToast(`Generated with ${res.unresolvedItems.length} unresolved items`, "info");
      } else {
        showToast("Diagram generated ✓", "success");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setGenerationError(msg);
      showToast(msg, "error");
    }
  };

  return (
    <div className="p-3 space-y-2 animate-fade-in">
      {/* Diagram type selector */}
      <div className="flex gap-1">
        {DIAGRAM_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setDiagramType(t.value)}
            className={`flex-1 text-xs py-1.5 rounded transition-all ${
              diagramType === t.value
                ? "bg-accent/20 text-accent border border-accent/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-surface-2"
            }`}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Prompt textarea */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleGenerate();
            }
          }}
          placeholder="Describe your system design…"
          className="w-full h-28 resize-none bg-surface-2 border border-border rounded text-sm text-slate-200 placeholder-slate-600 p-2.5 pr-9 focus:outline-none focus:border-accent/60 focus:bg-surface-3 transition-colors leading-relaxed"
          disabled={isGenerating}
        />
        <button
          className="absolute bottom-2 right-2 text-slate-600 hover:text-slate-400 transition-colors"
          onClick={() => {
            const sample = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
            if (sample) setPrompt(sample);
          }}
          title="Load a sample prompt"
          type="button"
        >
          <Info size={13} />
        </button>
      </div>

      {/* Complexity + Generate */}
      <div className="flex items-center gap-2">
        <select
          value={complexity}
          onChange={(e) => setComplexity(e.target.value as Complexity)}
          className="flex-1 text-xs bg-surface-2 border border-border text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60 cursor-pointer"
          disabled={isGenerating}
        >
          <option value="simple">Simple</option>
          <option value="medium">Medium</option>
          <option value="detailed">Detailed</option>
        </select>

        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleGenerate()}
          loading={isGenerating}
          disabled={!prompt.trim()}
          className="flex-shrink-0"
          id="generate-btn"
        >
          <Wand2 size={13} />
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* Refine existing diagram — shown when there's already a diagram */}
      {dsl && diagramId && !isGenerating && (
        <div className="pt-1 border-t border-border">
          <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
            <RefreshCw size={9} />
            Regenerate entire diagram with new prompt
          </p>
        </div>
      )}

      <p className="text-[10px] text-slate-600">⌘ Enter to generate</p>
    </div>
  );
}
