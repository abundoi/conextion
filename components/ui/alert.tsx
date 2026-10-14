import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
}

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  const variantStyles = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-200",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    danger: "bg-red-500/10 border-red-500/20 text-red-200",
  };

  return (
    <div
      role="alert"
      className={cn("rounded-xl border p-4 text-sm flex items-start gap-3", variantStyles[variant], className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
    </div>
  );
}
