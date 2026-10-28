import { ComponentPropsWithoutRef, ReactNode } from "react";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  interactive?: boolean;
  variant?: "flat" | "elevated" | "outline";
}

/**
 * Shopee-style Box/Card Component
 * Features subtle borders, crisp corner radius (rounded-sm), clean background with dark mode support.
 */
export function Card({
  children,
  className = "",
  interactive = false,
  variant = "flat",
  ...props
}: CardProps) {
  const baseClasses =
    "bg-white dark:bg-slate-800 border border-black/[0.06] dark:border-slate-700/60 rounded-sm";

  const variantClasses = {
    flat: "shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]",
    elevated: "shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
    outline: "border-gray-200 dark:border-slate-700 shadow-none",
  }[variant];

  const interactiveClasses = interactive
    ? "transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 hover:border-[#ee4d2d]/40 cursor-pointer"
    : "";

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={`px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100 dark:border-slate-700/60 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  icon,
  ...props
}: ComponentPropsWithoutRef<"h3"> & { icon?: ReactNode }) {
  return (
    <h3
      className={`text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2 ${className}`}
      {...props}
    >
      {icon && <span className="text-[#ee4d2d]">{icon}</span>}
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
