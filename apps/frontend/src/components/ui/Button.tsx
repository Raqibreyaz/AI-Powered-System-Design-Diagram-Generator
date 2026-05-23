import type { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

function clsx_(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover active:scale-[0.98]",
    secondary: "bg-surface-2 text-slate-200 border border-border hover:bg-surface-3 hover:border-border-strong",
    ghost: "text-slate-400 hover:text-slate-100 hover:bg-surface-2",
    danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-10 px-4 text-sm",
  };

  return (
    <button
      className={clsx_(base, variants[variant], sizes[size], className ?? "")}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
