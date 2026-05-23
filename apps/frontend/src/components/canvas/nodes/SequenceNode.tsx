import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { FlowNodeData } from "../../../dsl/dsl-to-flow";

/** Sequence diagram node — actor (stick figure header) or lifeline box */
export const SequenceNode = memo(({ data, selected }: NodeProps<Node<FlowNodeData>>) => {
  const isActor = data.nodeType === "actor";

  return (
    <div
      className={`px-3 py-2 rounded border text-center transition-all min-w-[100px]
        ${selected ? "border-accent bg-accent/10" : "border-border bg-surface-1"}
      `}
    >
      <Handle type="target" position={Position.Top} />
      {isActor && (
        <div className="flex justify-center mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={data.color} strokeWidth="2">
            <circle cx="12" cy="5" r="3" />
            <path d="M12 8v8M9 11h6M9 19l3 2 3-2" />
          </svg>
        </div>
      )}
      <span className="text-xs font-medium text-slate-100">{data.label}</span>
      {data.technology && (
        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{data.technology}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

SequenceNode.displayName = "SequenceNode";
