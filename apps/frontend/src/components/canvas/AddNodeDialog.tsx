/**
 * AddNodeDialog — modal to create a new node manually on the canvas.
 */

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../ui/Button";

const NODE_TYPES = [
  { value: "service", label: "Service", icon: "🔧" },
  { value: "database", label: "Database", icon: "🗄️" },
  { value: "queue", label: "Queue", icon: "📨" },
  { value: "storage", label: "Storage", icon: "💾" },
  { value: "gateway", label: "Gateway", icon: "🚪" },
  { value: "cdn", label: "CDN", icon: "🌐" },
  { value: "cache", label: "Cache", icon: "⚡" },
  { value: "client", label: "Client", icon: "💻" },
  { value: "loadbalancer", label: "Load Balancer", icon: "⚖️" },
  { value: "monitor", label: "Monitor", icon: "📊" },
  { value: "external", label: "External", icon: "🔗" },
  { value: "generic", label: "Generic", icon: "📦" },
] as const;

type NodeType = typeof NODE_TYPES[number]["value"];

interface AddNodeDialogProps {
  position: { x: number; y: number };
  onConfirm: (label: string, type: NodeType, technology?: string) => void;
  onClose: () => void;
}

export function AddNodeDialog({ position, onConfirm, onClose }: AddNodeDialogProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<NodeType>("service");
  const [technology, setTechnology] = useState("");

  const handleConfirm = () => {
    if (!label.trim()) return;
    onConfirm(label.trim(), type, technology.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-1 border border-border rounded-xl shadow-2xl w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-slate-100">Add Node</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1">
            <X size={13} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Node type grid */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Type</label>
            <div className="grid grid-cols-3 gap-1">
              {NODE_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs transition-all ${
                    type === t.value
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "text-slate-400 hover:bg-surface-2 border border-transparent hover:border-border"
                  }`}
                >
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="leading-none">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Label <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              placeholder="e.g. Order Service"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-accent/60 transition-colors"
              autoFocus
            />
          </div>

          {/* Technology (optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Technology <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
              placeholder="e.g. Node.js, PostgreSQL, Redis…"
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-accent/60 transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!label.trim()}
          >
            <Plus size={13} />
            Add Node
          </Button>
        </div>
      </div>
    </div>
  );
}
