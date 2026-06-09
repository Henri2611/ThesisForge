"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, type LucideIcon } from "lucide-react";

const variants = {
  primary:
    "bg-gradient-to-r from-primary to-accent-violet text-white hover:opacity-90 shadow-sm",
  secondary:
    "border border-border text-text-secondary hover:bg-secondary-surface bg-card",
  ghost: "text-text-muted hover:text-text-secondary hover:bg-secondary-surface",
  danger: "bg-error text-white hover:opacity-90",
  outline:
    "border border-border text-primary hover:bg-purple-bg",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon: Icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 disabled:opacity-40 cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : Icon ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, type ButtonProps };
