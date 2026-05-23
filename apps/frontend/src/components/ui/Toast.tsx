import { useEffect } from "react";
import { useUIStore } from "../../store/ui.store";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
}

export function Toast({ message, type }: ToastProps) {
  const { clearToast } = useUIStore();

  const colors = {
    success: "bg-success/10 border-success/30 text-success",
    error: "bg-danger/10 border-danger/30 text-danger",
    info: "bg-accent/10 border-accent/30 text-accent",
  };

  return (
    <div
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-sm font-medium shadow-lg animate-slide-up ${colors[type]}`}
      role="alert"
      onClick={clearToast}
    >
      {message}
    </div>
  );
}
