import { Layers } from "lucide-react";

export function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center gap-3 text-center pointer-events-none select-none">
      <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
        <Layers size={22} className="text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">No diagram yet</p>
        <p className="text-xs text-slate-600 mt-0.5">Enter a prompt or upload files to generate one</p>
      </div>
    </div>
  );
}
