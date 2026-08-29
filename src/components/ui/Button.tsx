import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "soft" | "dark";
type Size = "sm" | "md" | "lg";

// 모서리 반경은 size가 소유한다. base에 두면 cn()이 단순 결합이라 size 값이 덮이지 않는다.
const base =
  "inline-flex items-center justify-center gap-2 border font-semibold whitespace-nowrap " +
  "transition-[background-color,border-color,box-shadow,transform,filter] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none";

// 상태는 default → hover → active 순으로 한 단계씩만 진해진다.
// 강조 버튼만 브랜드 그림자를 지고 살짝 떠오른다.
const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-gradient-to-b from-primary to-primary-dark text-on-primary shadow-brand " +
    "hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:brightness-95",
  ghost:
    "border-line bg-card text-ink shadow-soft hover:-translate-y-px hover:border-primary/35 hover:bg-primary-soft/60 active:translate-y-0 active:bg-subtle",
  danger:
    "border-danger/20 bg-danger-soft text-danger hover:border-danger/40 hover:bg-danger/15 active:bg-danger/20",
  soft: "border-transparent bg-primary-soft text-primary-dark hover:bg-primary/15 active:bg-primary/20",
  dark: "border-transparent bg-ink text-card shadow-soft hover:-translate-y-px hover:bg-ink/88 active:translate-y-0",
};

// 최소 높이는 44px 터치 타깃 기준. sm은 밀집 표 안에서만 쓴다.
const sizes: Record<Size, string> = {
  sm: "min-h-9 rounded-lg px-3.5 text-xs",
  md: "min-h-11 rounded-xl px-5 text-sm",
  lg: "min-h-12 rounded-xl px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "ghost", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
