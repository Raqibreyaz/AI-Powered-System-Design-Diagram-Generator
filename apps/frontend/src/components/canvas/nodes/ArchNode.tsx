import { memo, useCallback } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { FlowNodeData } from "../../../dsl/dsl-to-flow";
import { ConfidenceBadge } from "../../ui/Badge";
import { useDiagramStore } from "../../../store/diagram.store";

// Icon map (subset of Lucide names → inline SVG paths)
const ICON_PATHS: Record<string, string> = {
  server: "M5 3h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 10h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2z",
  database: "M12 3c-4.4 0-8 1.8-8 4v10c0 2.2 3.6 4 8 4s8-1.8 8-4V7c0-2.2-3.6-4-8-4zm0 2c3.9 0 6 1.4 6 2s-2.1 2-6 2-6-1.4-6-2 2.1-2 6-2z",
  globe: "M12 2a10 10 0 100 20A10 10 0 0012 2zm0 2c1.1 0 2.5 1.8 3.3 4H8.7c.8-2.2 2.2-4 3.3-4zm-7.8 5h3.4c-.1.6-.1 1.3-.1 2s0 1.4.1 2H4.2a8 8 0 010-4zm2 6h2.7c.4 1.7 1 3.1 1.9 4.2A8 8 0 016.2 15zm4.1 4.8c-.7-1-1.3-2.4-1.6-4.8h6.6c-.3 2.4-.9 3.8-1.6 4.8a8 8 0 01-3.4 0zm5.5-.6c.9-1.1 1.5-2.5 1.9-4.2H20a8 8 0 01-4.2 4.2zm2.2-6.2c.1-.6.1-1.3.1-2s0-1.4-.1-2h3.4a8 8 0 010 4h-3.4z",
  shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  "hard-drive": "M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11zM6 16h.01M10 16h.01",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  monitor: "M21 2H3a1 1 0 00-1 1v13a1 1 0 001 1h7l-2 3h6l-2-3h7a1 1 0 001-1V3a1 1 0 00-1-1z",
  cpu: "M9 3H7a4 4 0 00-4 4v2M9 3v2M9 3h6M15 3h2a4 4 0 014 4v2M15 3v2M3 9v6M21 9v6M3 15v2a4 4 0 004 4h2M3 15h2M21 15h-2M21 15v2a4 4 0 01-4 4h-2M9 21v-2M9 21H7M15 21v-2M15 21h2",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  "git-branch": "M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  "external-link": "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
};

function NodeIcon({ name, color }: { name: string; color: string }) {
  const path = ICON_PATHS[name] ?? ICON_PATHS["box"]!;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

export const ArchNode = memo(({ id, data, selected }: NodeProps<Node<FlowNodeData>>) => {
  const updateLabel = useDiagramStore((s) => s.updateNodeLabel);

  const handleLabelDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      const span = e.currentTarget;
      span.contentEditable = "true";
      span.focus();
      const range = document.createRange();
      range.selectNodeContents(span);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    },
    []
  );

  const handleLabelBlur = useCallback(
    (e: React.FocusEvent<HTMLSpanElement>) => {
      e.currentTarget.contentEditable = "false";
      updateLabel(id, e.currentTarget.textContent ?? data.label);
    },
    [id, data.label, updateLabel]
  );

  const isLowConfidence = data.confidence < 0.7;

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border transition-all
        ${selected
          ? "border-accent shadow-lg shadow-accent/20"
          : isLowConfidence
          ? "border-warning/50 border-dashed"
          : "border-border hover:border-border-strong"
        }
        bg-surface-1 min-w-[120px] max-w-[200px] cursor-pointer
      `}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* Node type indicator */}
      <div className="flex items-center gap-1.5 mb-1">
        <NodeIcon name={data.icon} color={data.color} />
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">
          {data.nodeType}
        </span>
        {isLowConfidence && (
          <span className="ml-auto text-warning text-[10px]" title="Low confidence">⚠</span>
        )}
      </div>

      {/* Label — double-click to edit */}
      <span
        className="block text-xs font-medium text-slate-100 leading-tight break-words"
        onDoubleClick={handleLabelDoubleClick}
        onBlur={handleLabelBlur}
        suppressContentEditableWarning
      >
        {data.label}
      </span>

      {/* Technology chip */}
      {data.technology && (
        <span className="mt-1 block text-[10px] font-mono text-slate-400 truncate">
          {data.technology}
        </span>
      )}

      {/* Accent color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
        style={{ backgroundColor: data.color }}
      />
    </div>
  );
});

ArchNode.displayName = "ArchNode";
