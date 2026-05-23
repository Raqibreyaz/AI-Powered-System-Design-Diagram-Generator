import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { FlowNodeData } from "../../../dsl/dsl-to-flow";

export const FlowNode = memo(({ data, selected }: NodeProps<Node<FlowNodeData>>) => {
  const isDecision = data.nodeType === "decision";

  if (isDecision) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 60 }}>
        <Handle type="target" position={Position.Top} />
        <div
          className={`absolute inset-0 rotate-45 border rounded ${selected ? "border-accent bg-accent/10" : "border-warning/70 bg-warning/10"}`}
        />
        <span className="relative z-10 text-xs font-medium text-slate-100 text-center px-2 leading-tight">
          {data.label}
        </span>
        <Handle type="source" position={Position.Bottom} id="yes" />
        <Handle type="source" position={Position.Right} id="no" />
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-2 rounded border transition-all min-w-[100px] max-w-[180px]
        ${selected ? "border-accent bg-accent/10" : "border-border bg-surface-1 hover:border-border-strong"}
      `}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: data.color }} />
        <span className="text-xs font-medium text-slate-100 leading-tight">{data.label}</span>
      </div>
      {data.technology && (
        <span className="block mt-0.5 text-[10px] font-mono text-slate-400">{data.technology}</span>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

FlowNode.displayName = "FlowNode";
