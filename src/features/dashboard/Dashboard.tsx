"use client";

import {
  ChevronRight,
  GraduationCap,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import type { View } from "@/types";

const cards: {
  view: View;
  icon: typeof Users;
  title: string;
  text: string;
}[] = [
  {
    view: "quick-subject",
    icon: WandSparkles,
    title: "평어 빠른 생성",
    text: "성취기준별 문장 묶음을 빠르게 만들어요.",
  },
  {
    view: "class-subject",
    icon: Users,
    title: "우리 반 평어 작성",
    text: "명단과 평가표로 학생별 평어를 한 번에 작성해요.",
  },
  {
    view: "quick-behavior",
    icon: MessageCircleHeart,
    title: "행발 빠른 생성",
    text: "관찰 키워드와 메모로 안전한 초안을 만들어요.",
  },
  {
    view: "class-behavior",
    icon: GraduationCap,
    title: "우리 반 행발 작성",
    text: "학생별 관찰 기록을 이어서 차근차근 완성해요.",
  },
];

export function Dashboard({ setView }: { setView: (view: View) => void }) {
  return (
    <div>
      <section className="rounded-3xl border border-line bg-gradient-to-br from-primary-soft to-surface p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/60 px-2.5 py-1.5 text-xs font-semibold text-primary-dark">
          <Sparkles size={14} /> 2022 개정 교육과정 기반
        </span>
        <h1 className="my-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          선생님의 기록을
          <br />
          <em className="not-italic text-primary">쉽고 정확하게, 톡톡!</em>
        </h1>
        <p className="max-w-[610px] text-base leading-relaxed text-muted">
          공식 성취기준과 실제 관찰을 바탕으로 평어와 행발 초안을 만들고, 근거를 확인해 나이스에 바로
          복사하세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button variant="primary" size="lg" onClick={() => setView("class-subject")}>
            <Users size={18} /> 우리 반 평어 시작
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setView("quick-behavior")}>
            <MessageCircleHeart size={18} /> 행발 만들기
          </Button>
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight">무엇을 작성할까요?</h2>
          <p className="mt-1 text-muted">필요한 작업을 골라 바로 시작하세요.</p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ view, icon: Icon, title, text }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className="flex min-h-[126px] items-center gap-3 rounded-3xl border border-line bg-card p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon size={25} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block">{title}</b>
                <small className="mt-1 block text-xs leading-normal text-muted">{text}</small>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border border-success/20 bg-success/10 p-5 text-success">
        <ShieldCheck size={21} />
        <div className="flex flex-col">
          <b>학생 이름은 보내지 않고, 관찰 메모는 기기에서 익명화해 전송해요</b>
          <span className="text-xs text-muted">공식 근거 추적 · 교사 최종 확인</span>
        </div>
        <button
          className="flex items-center font-semibold text-success"
          onClick={() => setView("settings")}
        >
          개인정보 설정 <ChevronRight size={15} />
        </button>
      </section>
    </div>
  );
}
