"use client";

import { useEffect } from "react";
import { areasFor, gradeBandFor, standardsFor, subjectsFor } from "@/lib/curriculum";
import { gradesFor } from "@/lib/school";
import type { SchoolStage } from "@/types";
import { CurriculumUnavailable } from "./CurriculumUnavailable";

interface CurriculumPickerProps {
  schoolLevel: SchoolStage;
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
  schoolLevel,
  grade,
  setGrade,
  subject,
  setSubject,
  area,
  setArea,
  standardId,
  setStandardId,
}: CurriculumPickerProps) {
  const grades = gradesFor(schoolLevel);
  const safeGrade = grades.includes(grade) ? grade : grades[0];
  const band = gradeBandFor(schoolLevel, safeGrade);
  const subjects = subjectsFor(band);
  const safeSubject = subjects.includes(subject) ? subject : (subjects[0] ?? "");
  const areas = areasFor(band, safeSubject);
  const safeArea = areas.includes(area) ? area : (areas[0] ?? "");
  const choices = standardsFor(band, safeSubject, safeArea);
  const safeStandard = choices.some((item) => item.standardId === standardId)
    ? standardId
    : (choices[0]?.standardId ?? "");

  useEffect(() => {
    if (safeGrade !== grade) setGrade(safeGrade);
    if (safeSubject !== subject) setSubject(safeSubject);
    if (safeArea !== area) setArea(safeArea);
    if (safeStandard !== standardId) setStandardId(safeStandard);
  }, [
    safeGrade,
    safeSubject,
    safeArea,
    safeStandard,
    grade,
    subject,
    area,
    standardId,
    setGrade,
    setSubject,
    setArea,
    setStandardId,
  ]);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
      <label className={fieldClass}>
        <span className={labelClass}>학년</span>
        <select value={safeGrade} onChange={(event) => setGrade(Number(event.target.value))}>
          {grades.map((item) => (
            <option key={item} value={item}>
              {item}학년
            </option>
          ))}
        </select>
        {band && (
          <small className="text-[10px] text-muted">{band}학년군 공식 성취기준 사용</small>
        )}
      </label>
      {band ? (
        <>
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
        </>
      ) : (
        <div className="sm:col-span-2">
          <CurriculumUnavailable schoolLevel={schoolLevel} />
        </div>
      )}
    </div>
  );
}
