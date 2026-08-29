"use client";

import { Check, Eye, Palette, Settings, ShieldCheck, Trash2 } from "lucide-react";
import { Button, GlassPanel, PageHeading, Switch } from "@/components/ui";
import { clearLocalRosters } from "@/lib/local-db";
import { cn } from "@/lib/cn";
import type { Theme } from "@/types";
import { themeNames, themeOrder, themeSwatch } from "./themes";

export interface SettingsViewProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cloudNames: boolean;
  setCloudNames: (value: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  reduceTransparency: boolean;
  setReduceTransparency: (value: boolean) => void;
  toast: (message: string) => void;
}

export function SettingsView({
  theme,
  setTheme,
  cloudNames,
  setCloudNames,
  reduceMotion,
  setReduceMotion,
  reduceTransparency,
  setReduceTransparency,
  toast,
}: SettingsViewProps) {
  const toggleCloudNames = () => {
    if (
      !cloudNames &&
      !window.confirm(
        "실명을 클라우드에 저장하면 다른 기기에서 편리하지만 개인정보 노출 위험이 커집니다. 사용자 본인의 비공개 경로에 저장하도록 켤까요?",
      )
    ) {
      return;
    }
    setCloudNames(!cloudNames);
    toast(
      !cloudNames
        ? "실명 클라우드 저장을 켰습니다. 학생 이름은 외부 AI로 전송하지 않습니다."
        : "이후부터 실명을 클라우드에 저장하지 않습니다.",
    );
  };

  const clearNames = async () => {
    if (
      !window.confirm(
        "현재 기기에 보관된 모든 학생 이름을 삭제할까요? 평가단계와 익명 학생 ID는 유지됩니다.",
      )
    ) {
      return;
    }
    await clearLocalRosters();
    toast("현재 기기의 로컬 실명을 삭제했습니다. 복구할 수 없습니다.");
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeading
        eyebrow="환경 설정"
        title="설정과 개인정보"
        description="화면 테마, 접근성, 실명 저장 정책을 관리합니다."
        icon={Settings}
      />
      <div className="grid gap-3.5">
        <GlassPanel className="grid grid-cols-[40px_1fr] gap-3">
          <Palette className="text-primary" />
          <div>
            <h2 className="text-lg font-bold">배경 테마</h2>
            <p className="mb-3.5 mt-1 text-xs text-muted">
              계정 연결 후에는 다른 기기에도 설정이 유지됩니다.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {themeOrder.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTheme(item)}
                  className={cn(
                    "flex min-h-[45px] items-center gap-2 rounded-xl border px-2.5 text-[11px]",
                    theme === item ? "border-primary bg-primary-soft" : "border-line bg-solid/60",
                  )}
                >
                  <span
                    className="size-[17px] rounded-md"
                    style={{ background: themeSwatch[item] }}
                  />
                  {themeNames[item]}
                  {theme === item && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="grid grid-cols-[40px_1fr] gap-3">
          <ShieldCheck className="text-primary" />
          <div>
            <h2 className="text-lg font-bold">실명 저장 정책</h2>
            <p className="mb-3.5 mt-1 text-xs text-muted">기본값은 ‘실명 클라우드 비저장’입니다.</p>
            <div className="flex items-center justify-between gap-2.5 border-t border-line py-3">
              <div>
                <b>실명 클라우드 저장</b>
                <small className="block text-muted">
                  {cloudNames
                    ? "켜짐 · 사용자 전용 비공개 경로에 저장"
                    : "꺼짐 · 학생 이름은 IndexedDB에만 보관"}
                </small>
              </div>
              <Switch checked={cloudNames} onChange={toggleCloudNames} label="실명 클라우드 저장" />
            </div>
            <Button variant="danger" className="mt-3" onClick={() => void clearNames()}>
              <Trash2 size={16} /> 현재 기기의 로컬 실명 삭제
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="grid grid-cols-[40px_1fr] gap-3">
          <Eye className="text-primary" />
          <div>
            <h2 className="text-lg font-bold">접근성</h2>
            <p className="mb-3.5 mt-1 text-xs text-muted">모션과 투명 효과를 줄일 수 있습니다.</p>
            <label className="flex items-center justify-between border-t border-line py-3">
              <span>모션 줄이기</span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between border-t border-line py-3">
              <span>투명 효과 줄이기</span>
              <input
                type="checkbox"
                checked={reduceTransparency}
                onChange={(event) => setReduceTransparency(event.target.checked)}
              />
            </label>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
