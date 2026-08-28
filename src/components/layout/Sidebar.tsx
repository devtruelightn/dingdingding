"use client";

import { ShieldCheck, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { View } from "@/types";
import { navItems } from "./nav";

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  open: boolean;
  onClose: () => void;
  onOpenTutorial: () => void;
}

export function Sidebar({ view, onNavigate, open, onClose, onOpenTutorial }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col gap-5 border-r border-line bg-card/90 px-4 pb-4 pt-5 backdrop-blur-lg transition-transform",
        "max-lg:shadow-lg",
        open ? "translate-x-0" : "max-lg:-translate-x-[105%]",
      )}
    >
      <IconButton
        className="absolute right-2 top-2 lg:hidden"
        aria-label="메뉴 닫기"
        onClick={onClose}
      >
        <X />
      </IconButton>

      <button
        className="flex min-h-[52px] items-center gap-3 px-1.5 text-left"
        onClick={() => onNavigate("dashboard")}
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[#9c8ce9] text-lg font-black text-white"
          aria-hidden
        >
          <span>평</span>
        </span>
        <span className="flex flex-col">
          <b className="text-lg tracking-tight">평행톡톡</b>
          <small className="text-[11px] text-muted">교사의 기록 도우미</small>
        </span>
      </button>

      <nav className="flex flex-col gap-1.5" aria-label="주요 메뉴">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-left",
              view === id
                ? "bg-primary-soft font-semibold text-primary-dark"
                : "text-muted hover:bg-primary-soft/50 hover:text-ink",
            )}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-line bg-primary-soft/60 p-4">
        <span className="text-xl">💡</span>
        <b className="mt-1 block">처음이신가요?</b>
        <p className="my-2 text-xs text-muted">3분이면 사용법을 익힐 수 있어요.</p>
        <button
          onClick={onOpenTutorial}
          className="text-xs font-semibold text-primary-dark"
        >
          튜토리얼 보기
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-solid/55 p-2.5 text-success">
        <ShieldCheck size={16} />
        <span className="flex flex-col">
          <b className="text-[11px]">공식 자료 연결</b>
          <small className="text-[10px] text-muted">2022 개정 성취기준 · 검증 완료</small>
        </span>
      </div>
    </aside>
  );
}
