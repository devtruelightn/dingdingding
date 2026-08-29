import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 클릭할 수 있는 카드에만 켠다. hover 시 살짝 떠오른다. */
  interactive?: boolean;
}

/**
 * 기본 콘텐츠 컨테이너. 불투명한 흰 표면 + 넉넉한 곡률(16px)과
 * 아주 옅은 그림자로 배경에서 부드럽게 떠 있게 만든다.
 */
export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-card p-6 shadow-soft",
        interactive && "lift cursor-pointer hover:border-primary/40",
        className,
      )}
      {...props}
    />
  );
}
