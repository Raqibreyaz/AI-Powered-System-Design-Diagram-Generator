interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${className ?? ""}`}
      style={color ? { backgroundColor: `${color}22`, color, borderColor: `${color}44`, border: "1px solid" } : undefined}
    >
      {children}
    </span>
  );
}

/** Confidence badge — green/yellow/red based on value */
export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "#10b981" : value >= 0.6 ? "#f59e0b" : "#ef4444";
  return <Badge color={color}>{pct}%</Badge>;
}
