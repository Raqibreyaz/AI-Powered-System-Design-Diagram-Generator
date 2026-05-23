/**
 * DiagramCanvas — the main React Flow wrapper.
 * Manages node/edge types, keyboard shortcuts, and canvas export.
 */

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useDiagramStore } from "../../store/diagram.store";
import { useUIStore } from "../../store/ui.store";
import { ArchNode } from "./nodes/ArchNode";
import { FlowNode } from "./nodes/FlowNode";
import { SequenceNode } from "./nodes/SequenceNode";
import { LabeledEdge } from "./edges/LabeledEdge";
import { CanvasToolBar } from "./controls/ToolBar";
import { EmptyCanvas } from "./EmptyCanvas";

const nodeTypes = {
  archNode: ArchNode,
  flowNode: FlowNode,
  sequenceNode: SequenceNode,
} as any;

const edgeTypes = {
  labeled: LabeledEdge,
} as any;

export function DiagramCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    setViewport,
    dsl,
    isGenerating,
  } = useDiagramStore();

  const { toggleRightPanel, setRightPanelTab } = useUIStore();

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = useCallback(() => {
    setRightPanelTab("inspector");
    toggleRightPanel();
  }, [setRightPanelTab, toggleRightPanel]);

  const isEmpty = !dsl || nodes.length === 0;

  return (
    <div ref={canvasRef} className="relative w-full h-full bg-surface" id="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeClick={handleNodeClick}
        onMoveEnd={(_event, viewport) => setViewport(viewport)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={3}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-right"
          style={{ marginBottom: 80 }}
          nodeColor={(node) => (node.data as { color?: string })?.color ?? "#2d3548"}
          maskColor="rgba(15, 17, 23, 0.7)"
        />

        <Panel position="top-left">
          <CanvasToolBar canvasRef={canvasRef} />
        </Panel>

        {isEmpty && !isGenerating && (
          <Panel position="top-center" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <EmptyCanvas />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
