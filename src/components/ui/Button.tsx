import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "soft" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-transparent font-bold whitespace-nowrap transition-[filter,transform,background-color] disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-sm hover:brightness-105 hover:-translate-y-px",
  ghost: "border-line bg-solid/70 hover:bg-primary-soft",
  danger: "border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
  soft: "bg-primary-soft text-primary-dark hover:brightness-[.97]",
  dark: "bg-[#16181d] text-white shadow-sm hover:brightness-150",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[35px] px-2.5 text-xs",
  md: "min-h-[42px] px-4 text-sm",
  lg: "min-h-[50px] px-5 rounded-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "ghost", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
