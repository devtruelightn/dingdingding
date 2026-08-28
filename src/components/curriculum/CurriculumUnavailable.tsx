import { Hourglass } from "lucide-react";
import { schoolStageLabel } from "@/lib/school";
import type { SchoolStage } from "@/types";

/**
 * 성취기준 데이터가 아직 없는 학교급에서 초등 과목이 대신 표시되지 않도록
 * 과목 선택 자리에 놓는 안내.
 */
export function CurriculumUnavailable({ schoolLevel }: { schoolLevel: SchoolStage }) {
  const label = schoolStageLabel[schoolLevel];
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-solid/50 p-7 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
        <Hourglass size={20} />
      </span>
      <b className="text-base">{label} 과목 데이터는 준비 중입니다</b>
      <p className="max-w-[440px] text-xs leading-relaxed text-muted">
        지금 담긴 성취기준은 2022 개정 초등학교 교육과정뿐입니다. 초등 과목이 잘못
        표시되지 않도록 과목·평가영역·성취기준 선택을 잠가 두었고, {label} 성취기준이
        추가되면 바로 사용할 수 있습니다.
      </p>
    </div>
  );
}
