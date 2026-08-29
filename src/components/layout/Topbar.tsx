"use client";

import { HelpCircle, LogIn, LogOut, Menu, Moon, RefreshCw } from "lucide-react";
import { Button, IconButton } from "@/components/ui";
import type { User } from "@/lib/firebase";

interface TopbarProps {
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  signingIn: boolean;
  user: User | null;
}

export function Topbar({
  onOpenMenu,
  onOpenSettings,
  onOpenTutorial,
  onSignIn,
  onSignOut,
  signingIn,
  user,
}: TopbarProps) {
  return (
    <header className="glass sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-line px-4 sm:px-7">
      <div className="flex items-center gap-2">
        <IconButton className="lg:hidden" aria-label="메뉴 열기" onClick={onOpenMenu}>
          <Menu />
        </IconButton>
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
          <Button
            variant="dark"
            disabled={signingIn}
            onClick={onSignIn}
          >
            {signingIn ? <RefreshCw className="animate-spin-slow" size={16} /> : <LogIn size={16} />}
            <span className="max-sm:hidden">{signingIn ? "로그인 중" : "Google 로그인"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
