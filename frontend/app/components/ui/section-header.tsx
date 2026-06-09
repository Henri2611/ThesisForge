import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border pb-3", className)}>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  )
}
