"use client";

import { useEffect } from "react";
import {
  areasFor,
  gradeBandForGrade,
  standardsFor,
  subjectsFor,
} from "@/lib/curriculum";

interface CurriculumPickerProps {
  grade: number;
  setGrade: (grade: number) => void;
  subject: string;
  setSubject: (subject: string) => void;
  area: string;
  setArea: (area: string) => void;
  standardId: string;
  setStandardId: (id: string) => void;
}

const fieldClass = "flex flex-col gap-1.5";
const labelClass = "text-xs font-extrabold";

/** 학년 → 과목 → 평가영역 → 성취기준을 순서대로 고르는 셀렉트 그룹. */
export function CurriculumPicker({
  grade,
  setGrade,
  subject,
  setSubject,
  area,
  setArea,
  standardId,
  setStandardId,
}: CurriculumPickerProps) {
  const band = gradeBandForGrade(grade);
  const subjects = subjectsFor(band);
  const safeSubject = subjects.includes(subject) ? subject : subjects[0];
  const areas = areasFor(band, safeSubject);
  const safeArea = areas.includes(area) ? area : areas[0];
  const choices = standardsFor(band, safeSubject, safeArea);
  const safeStandard = choices.some((item) => item.standardId === standardId)
    ? standardId
    : choices[0]?.standardId;

  useEffect(() => {
    if (safeSubject !== subject) setSubject(safeSubject);
    if (safeArea !== area) setArea(safeArea);
    if (safeStandard && safeStandard !== standardId) setStandardId(safeStandard);
  }, [safeSubject, safeArea, safeStandard, subject, area, standardId, setSubject, setArea, setStandardId]);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <label className={fieldClass}>
        <span className={labelClass}>학년</span>
        <select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <option key={item} value={item}>
              {item}학년
            </option>
          ))}
        </select>
        <small className="text-[10px] text-muted">{band}학년군 공식 성취기준 사용</small>
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>과목</span>
        <select value={safeSubject} onChange={(event) => setSubject(event.target.value)}>
          {subjects.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>평가영역</span>
        <select value={safeArea} onChange={(event) => setArea(event.target.value)}>
          {areas.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className={`${fieldClass} sm:col-span-3`}>
        <span className={labelClass}>성취기준</span>
        <select value={safeStandard} onChange={(event) => setStandardId(event.target.value)}>
          {choices.map((item) => (
            <option key={item.standardId} value={item.standardId}>
              [{item.standardCode}] {item.standardText}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
