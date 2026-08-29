"use client";

import { HelpCircle, LogIn, LogOut, Moon, RefreshCw } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/firebase";
import { roleLabel, schoolStageLabel } from "@/lib/school";
import type { TeacherProfile, View } from "@/types";
import { navItemsFor } from "./nav";

interface TopbarProps {
  view: View;
  profile: TeacherProfile;
  onNavigate: (view: View) => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  signingIn: boolean;
  user: User | null;
}

export function Topbar({
  view,
  profile,
  onNavigate,
  onRestart,
  onOpenSettings,
  onOpenTutorial,
  onSignIn,
  onSignOut,
  signingIn,
  user,
}: TopbarProps) {
  const context = `${schoolStageLabel[profile.schoolLevel]} ${profile.grade}학년 · ${roleLabel(
    profile.schoolLevel,
    profile.role,
  )}`;

  return (
    <header className="glass sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-2 py-1 text-left transition-colors duration-150 hover:bg-primary-soft"
          onClick={onRestart}
          title="학교급부터 다시 선택"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-base font-bold text-on-primary shadow-brand"
            aria-hidden
          >
            아
          </span>
          <span className="flex min-w-0 flex-col max-sm:hidden">
            <b className="text-sm font-bold leading-tight">아주 나이스</b>
            <small className="truncate text-xs text-muted">{context}</small>
          </span>
        </button>

        <nav className="flex min-w-0 items-center gap-1" aria-label="주요 메뉴">
          {navItemsFor(profile.schoolLevel, profile.role).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={view === id ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm transition-all duration-150",
                view === id
                  ? "bg-gradient-to-r from-primary to-primary-dark font-semibold text-on-primary shadow-brand"
                  : "text-muted hover:bg-primary-soft hover:text-primary-dark",
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <IconButton className="max-sm:hidden" aria-label="테마 설정" onClick={onOpenSettings}>
          <Moon size={19} />
        </IconButton>
        <IconButton className="max-sm:hidden" aria-label="도움말" onClick={onOpenTutorial}>
          <HelpCircle size={19} />
        </IconButton>
        {user ? (
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-card py-0 pl-1 pr-3 transition-colors duration-150 hover:bg-subtle"
            onClick={onSignOut}
            title="로그아웃"
          >
            <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-primary-soft text-xs font-bold">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="size-full object-cover" />
              ) : (
                (user.displayName?.[0] ?? "선")
              )}
            </span>
            <b className="max-sm:hidden">{user.displayName ?? "선생님"}</b>
            <LogOut size={15} className="max-sm:hidden" />
          </button>
        ) : (
          <button
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-3 text-sm",
              "text-muted transition-colors duration-150",
              "hover:border-line hover:bg-primary-soft hover:text-primary-dark active:bg-primary/15",
              "disabled:pointer-events-none disabled:opacity-45",
            )}
            disabled={signingIn}
            onClick={onSignIn}
          >
            {signingIn ? <RefreshCw className="animate-spin-slow" size={16} /> : <LogIn size={16} />}
            <span>{signingIn ? "로그인 중" : "로그인"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
