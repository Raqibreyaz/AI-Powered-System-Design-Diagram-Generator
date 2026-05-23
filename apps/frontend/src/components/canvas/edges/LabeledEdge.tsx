import { memo } from "react";
import type { EdgeProps, Edge } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { FlowEdgeData } from "../../../dsl/dsl-to-flow";

export const LabeledEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<Edge<FlowEdgeData>>) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const isLowConfidence = (data?.confidence ?? 1) < 0.7;
    const strokeColor = selected ? "#6366f1" : isLowConfidence ? "#6b7280" : "#3d4a5f";

    return (
      <>
        <BaseEdge
          path={edgePath}
          id={id}
          style={{
            stroke: strokeColor,
            strokeWidth: selected ? 2 : 1.5,
            strokeDasharray: isLowConfidence ? "5 5" : undefined,
          }}
        />

        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
              }}
              className="nodrag nopan"
            >
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-1 border border-border text-slate-400">
                {data.label}
                {data.protocol && data.protocol !== data.label ? ` · ${data.protocol}` : ""}
              </span>
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

LabeledEdge.displayName = "LabeledEdge";
