import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
}

export function MetricCard({ label, value, icon: Icon, iconColor }: MetricCardProps) {
  return (
    <div
      className="flex h-[104px] flex-col justify-between rounded-lg border border-border bg-card p-6 transition-all duration-150"
      style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconColor || "text-text-muted")} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <span className="text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </span>
    </div>
  )
}
