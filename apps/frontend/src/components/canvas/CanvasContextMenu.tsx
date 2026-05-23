/**
 * CanvasContextMenu — right-click menu on the canvas.
 * Appears at the click position and provides:
 * - Add Node (at clicked position)
 * - Delete selected nodes/edges
 * - Clear selection
 */

import { useEffect, useRef } from "react";
import { Plus, Trash2, X } from "lucide-react";

export interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  targetNodeId?: string;
}

interface CanvasContextMenuProps {
  state: ContextMenuState;
  selectedCount: number;
  onAddNode: (flowX: number, flowY: number) => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

export function CanvasContextMenu({
  state,
  selectedCount,
  onAddNode,
  onDeleteSelected,
  onClose,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const menuItems = [
    {
      icon: <Plus size={13} />,
      label: "Add Node Here",
      onClick: () => { onAddNode(state.flowX, state.flowY); onClose(); },
      alwaysVisible: true,
    },
    {
      icon: <Trash2 size={13} />,
      label: `Delete Selected (${selectedCount})`,
      onClick: () => { onDeleteSelected(); onClose(); },
      alwaysVisible: false,
      disabled: selectedCount === 0,
      danger: true,
    },
    {
      icon: <X size={13} />,
      label: "Clear Selection",
      onClick: onClose,
      alwaysVisible: false,
      disabled: selectedCount === 0,
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-30 bg-surface-1 border border-border rounded-lg shadow-xl min-w-[180px] py-1 animate-fade-in"
      style={{ left: state.x, top: state.y }}
    >
      {menuItems.map((item) => {
        if (!item.alwaysVisible && item.disabled) return null;
        return (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${
              item.danger
                ? "text-danger hover:bg-danger/10"
                : "text-slate-300 hover:bg-surface-2"
            } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={item.disabled}
          >
            <span className="text-slate-500">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
