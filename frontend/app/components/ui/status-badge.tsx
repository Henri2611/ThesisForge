import { cn } from "@/lib/utils"

type StatusVariant = "indexed" | "indexing" | "failed" | "pending" | "generating" | "completed" | "cancelled"

const variantStyles: Record<StatusVariant, string> = {
  indexed: "bg-success-bg text-success",
  indexing: "bg-info-bg text-info",
  failed: "bg-error-bg text-error",
  pending: "bg-surface text-text-muted",
  generating: "bg-info-bg text-info",
  completed: "bg-success-bg text-success",
  cancelled: "bg-surface text-text-muted",
}

interface StatusBadgeProps {
  status: StatusVariant | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = variantStyles[status as StatusVariant] || "bg-surface text-text-muted"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight",
        style,
        className
      )}
    >
      {status}
    </span>
  )
}
