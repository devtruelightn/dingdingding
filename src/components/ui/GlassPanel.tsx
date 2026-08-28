import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 반투명 카드 컨테이너. data-reduce-transparency 설정 시 불투명해진다. */
export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-line bg-card/95 p-6 shadow-sm backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}
