"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button, IconButton, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import { tutorialSteps } from "./steps";

/** 첫 방문 온보딩 모달. onClose(true)면 "다시 보지 않기". */
export function Tutorial({ onClose }: { onClose: (hideForever: boolean) => void }) {
  const [step, setStep] = useState(0);
  const { emoji, title, body } = tutorialSteps[step];
  const isLast = step === tutorialSteps.length - 1;

  return (
    <Modal labelledBy="tutorial-title">
      <section className="w-full max-w-[560px] rounded-3xl border border-line bg-solid p-6 text-center shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary-soft px-2.5 py-1.5 text-[11px] font-extrabold text-primary-dark">
            {step + 1} / {tutorialSteps.length}
          </span>
          <IconButton aria-label="튜토리얼 닫기" onClick={() => onClose(false)}>
            <X size={20} />
          </IconButton>
        </div>
        <div
          className="mx-auto my-4 grid size-[92px] place-items-center rounded-3xl bg-primary-soft text-5xl"
          aria-hidden
        >
          {emoji}
        </div>
        <h2 id="tutorial-title" className="text-2xl font-bold">
          {title}
        </h2>
        <p className="mx-auto my-3 min-h-[56px] max-w-[440px] leading-relaxed text-muted">{body}</p>
        <div
          className="my-4 flex justify-center gap-1.5"
          aria-label={`전체 ${tutorialSteps.length}단계 중 ${step + 1}단계`}
        >
          {tutorialSteps.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step ? "w-6 bg-primary" : "w-1.5 bg-muted/40",
              )}
            />
          ))}
        </div>
        <div className="flex justify-between gap-2.5">
          <Button variant="ghost" onClick={() => (step ? setStep(step - 1) : onClose(false))}>
            <ChevronLeft size={17} /> {step ? "이전" : "건너뛰기"}
          </Button>
          {isLast ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onClose(true)}>
                다시 보지 않기
              </Button>
              <Button variant="primary" onClick={() => onClose(false)}>
                시작하기 <Sparkles size={17} />
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              다음 <ChevronRight size={17} />
            </Button>
          )}
        </div>
      </section>
    </Modal>
  );
}
