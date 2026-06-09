import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, rightElement, type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-text-primary">{label}</label>
        )}
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border border-border bg-input px-3 transition-colors focus-within:border-primary/40",
            error && "border-error",
            className
          )}
        >
          {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
          <input
            ref={ref}
            type={type}
            className="h-10 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none"
            {...props}
          />
          {rightElement && <span className="shrink-0">{rightElement}</span>}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, type InputProps };
