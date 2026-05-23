/**
 * Right panel — shows inspector for selected node/edge,
 * evidence/source refs, and unresolved items.
 */

import { X, FileText, AlertTriangle, Info } from "lucide-react";
import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { ConfidenceBadge, Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useUIStore();
  const { selectedNodeIds, nodes, dsl, unresolvedItems } = useDiagramStore();

  if (!rightPanelOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeIds[0]);
  const selectedDSLNode = dsl?.nodes.find((n) => n.id === selectedNodeIds[0]);

  return (
    <div className="w-64 flex-shrink-0 bg-surface-1 border-l border-border flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          {(["inspector", "evidence", "unresolved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setRightPanelTab(tab)}
              className={`text-xs px-2 py-1 rounded capitalize transition-all ${
                rightPanelTab === tab
                  ? "bg-accent/20 text-accent"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "unresolved" ? `⚠ (${unresolvedItems.length})` : tab}
            </button>
          ))}
        </div>
        <button
          onClick={toggleRightPanel}
          className="text-slate-500 hover:text-slate-200 transition-colors p-1"
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {rightPanelTab === "inspector" && (
          <InspectorTab node={selectedDSLNode} flowNode={selectedNode} />
        )}
        {rightPanelTab === "evidence" && (
          <EvidenceTab node={selectedDSLNode} />
        )}
        {rightPanelTab === "unresolved" && (
          <UnresolvedTab items={unresolvedItems} />
        )}
      </div>
    </div>
  );
}

function InspectorTab({ node, flowNode }: { node: unknown; flowNode: unknown }) {
  const n = node as { id: string; type: string; label: string; description?: string; technology?: string; confidence: number; metadata?: Record<string, unknown> } | undefined;

  if (!n) {
    return (
      <div className="text-xs text-slate-500 text-center py-8">
        <Info size={16} className="mx-auto mb-2 opacity-50" />
        Select a node to inspect
      </div>
    );
  }

  const meta = n.metadata ?? {};
  const cleanMeta = Object.entries(meta).filter(([k]) => !k.startsWith("_"));

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-500 uppercase">{n.type}</span>
          <ConfidenceBadge value={n.confidence} />
          {n.confidence < 0.7 && (
            <Badge color="#f59e0b">Inferred</Badge>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-100">{n.label}</h3>
        {n.technology && (
          <p className="text-xs font-mono text-slate-400 mt-0.5">{n.technology}</p>
        )}
      </div>

      {n.description && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-xs text-slate-300 leading-relaxed">{n.description}</p>
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Node ID</p>
        <code className="text-[10px] font-mono bg-surface-2 px-1.5 py-0.5 rounded text-slate-400">
          {n.id}
        </code>
      </div>

      {cleanMeta.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Metadata</p>
          <div className="space-y-1">
            {cleanMeta.map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono">{k}</span>
                <span className="text-slate-300 font-mono truncate ml-2">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceTab({ node }: { node: unknown }) {
  const n = node as { sourceRefs?: Array<{ type: string; fileName?: string; lineStart?: number; lineEnd?: number; snippet?: string; inferenceNote?: string }> } | undefined;

  if (!n) {
    return (
      <div className="text-xs text-slate-500 text-center py-8">Select a node to see evidence</div>
    );
  }

  const refs = n.sourceRefs ?? [];

  if (refs.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-8">No source references recorded</div>
    );
  }

  return (
    <div className="space-y-2">
      {refs.map((ref, i) => (
        <div key={i} className="bg-surface-2 rounded p-2 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={10} className="text-slate-500" />
            <Badge color={ref.type === "file" ? "#3b82f6" : ref.type === "prompt" ? "#10b981" : "#f59e0b"}>
              {ref.type}
            </Badge>
            {ref.fileName && (
              <span className="text-[10px] font-mono text-slate-400">{ref.fileName}</span>
            )}
            {ref.lineStart != null && (
              <span className="text-[10px] text-slate-500">L{ref.lineStart}–{ref.lineEnd}</span>
            )}
          </div>
          {ref.snippet && (
            <pre className="text-[10px] font-mono text-slate-400 bg-surface rounded p-1 overflow-x-auto whitespace-pre-wrap">
              {ref.snippet}
            </pre>
          )}
          {ref.inferenceNote && (
            <p className="text-[10px] text-warning mt-1 flex gap-1 items-start">
              <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
              {ref.inferenceNote}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function UnresolvedTab({ items }: { items: Array<{ description: string; reason: string }> }) {
  if (items.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-8">
        <span className="text-success">✓</span> No unresolved items
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        The AI was uncertain about these items and excluded them:
      </p>
      {items.map((item, i) => (
        <div key={i} className="bg-warning/5 border border-warning/20 rounded p-2">
          <p className="text-xs font-medium text-warning flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            {item.description}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{item.reason}</p>
        </div>
      ))}
    </div>
  );
}
