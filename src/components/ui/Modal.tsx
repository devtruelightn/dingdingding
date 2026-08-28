import type { ReactNode } from "react";

interface ModalProps {
  labelledBy: string;
  children: ReactNode;
}

/** 화면 중앙 모달. 배경을 흐리게 처리한다. */
export function Modal({ labelledBy, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/45 p-5 backdrop-blur-sm"
    >
      {children}
    </div>
  );
}
