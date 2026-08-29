import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-grid min-h-11 min-w-11 place-items-center rounded-xl border border-transparent",
        "text-muted hover:border-line hover:bg-solid/60",
        className,
      )}
      {...props}
    />
  );
}
