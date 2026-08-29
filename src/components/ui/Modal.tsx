import type { ReactNode } from "react";

interface ModalProps {
  labelledBy: string;
  children: ReactNode;
}

/** 화면 중앙 모달. 배경 스크림으로 뒤 콘텐츠를 눌러 초점을 만든다. */
export function Modal({ labelledBy, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-ink/40 p-6 backdrop-blur-sm"
    >
      {children}
    </div>
  );
}
