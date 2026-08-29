import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 아이콘 전용 버튼. aria-label은 호출부에서 반드시 넘긴다. */
export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-grid min-h-11 min-w-11 place-items-center rounded-xl border border-transparent",
        "text-muted transition-colors duration-150",
        "hover:border-line hover:bg-primary-soft hover:text-primary-dark active:bg-primary/15",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}
