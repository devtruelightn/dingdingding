"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { CurriculumPicker } from "@/components/curriculum/CurriculumPicker";
import { Button, GlassPanel, PageHeading, Segmented, Stepper } from "@/components/ui";
import { AssessmentPlanStart, type PlanSetupMode } from "@/features/assessment-plan";
import { RosterInput } from "@/features/roster/RosterInput";
import { officialLevelFor, schoolLevelsFor, standards } from "@/lib/curriculum";
import { auth, generateSubjectWithAi, isCloudAiEnabled } from "@/lib/firebase";
import { maskName } from "@/lib/mask";
import {
  createUniqueGroundedSentence,
  isSubjectSentenceTooSimilar,
  normalizeSentence,
  utf8Bytes,
} from "@/lib/text";
import type {
  CurriculumStandard,
  GeneratedSentence,
  SavedAssessmentPlan,
  SchoolLevel,
  Student,
} from "@/types";
import { SentenceEditor } from "./components/SentenceEditor";
import { buildSubjectAiRequest } from "./subjectAi";

interface ClassSubjectProps {
  privacy: boolean;
  toast: (message: string) => void;
  savedPlan: SavedAssessmentPlan | null;
  onSavePlan: (plan: SavedAssessmentPlan) => Promise<void>;
}

const STEP_LABELS = ["기본 설정", "명단 입력", "평가 입력", "결과 검토"];

/** 명단 × 여러 성취기준 평가표로 학생별 평어를 한 번에 작성하는 화면. */
export function ClassSubject({ privacy, toast, savedPlan, onSavePlan }: ClassSubjectProps) {
  const [step, setStep] = useState(1);
  const [planMode, setPlanMode] = useState<PlanSetupMode>("choose");
  const regenerationSeed = useRef(0);
  const sentenceHistory = useRef<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grade, setGrade] = useState(3);
  const [levelCount, setLevelCount] = useState<3 | 4 | 5>(3);
  const [subject, setSubject] = useState("국어");
  const [area, setArea] = useState("듣기·말하기");
  const [standardId, setStandardId] = useState("");
  const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, SchoolLevel>>({});
  const [results, setResults] = useState<GeneratedSentence[]>([]);
  const [summary, setSummary] = useState<Record<string, string>>({});

  const selectedStandards = selectedStandardIds
    .map((id) => standards.find((item) => item.standardId === id))
    .filter((item): item is CurriculumStandard => Boolean(item));
  const levels = schoolLevelsFor(levelCount);
  const cellKey = (studentId: string, selectedStandardId: string) =>
    `${studentId}::${selectedStandardId}`;
  const totalCells = students.length * selectedStandards.length;
  const completedCells = students.reduce(
    (count, student) =>
      count +
      selectedStandards.filter((s) => ratings[cellKey(student.id, s.standardId)]).length,
    0,
  );
  const progress = totalCells ? Math.round((completedCells / totalCells) * 100) : 0;

  const handlePlanStandards = (selected: CurriculumStandard[]) => {
    if (!selected.length) {
      setSelectedStandardIds([]);
      return;
    }
    const gradeBand = selected[0].gradeBand;
    const compatible = selected.filter((item) => item.gradeBand === gradeBand).slice(0, 12);
    const first = compatible[0];
    setSelectedStandardIds(compatible.map((item) => item.standardId));
    setGrade(Number(first.standardCode[0]));
    setSubject(first.subjectName);
    setArea(first.areaName);
    setStandardId(first.standardId);
    setRatings({});
    setResults([]);
    setSummary({});
    if (compatible.length < selected.length) {
      toast("같은 학년군의 성취기준 12개까지 자동으로 불러왔습니다.");
    }
  };

  const addStandard = (candidateId = standardId) => {
    const candidate = standards.find((item) => item.standardId === candidateId);
    if (!candidate) return toast("추가할 성취기준을 먼저 선택해 주세요.");
    const selectedBand = selectedStandards[0]?.gradeBand;
    if (selectedBand && selectedBand !== candidate.gradeBand) {
      return toast("한 작업에는 같은 학년군의 성취기준만 함께 넣을 수 있습니다.");
    }
    if (selectedStandardIds.includes(candidate.standardId)) return toast("이미 추가한 성취기준입니다.");
    if (selectedStandardIds.length >= 12) {
      return toast("한 작업에는 성취기준을 최대 12개까지 추가할 수 있습니다.");
    }
    setSelectedStandardIds((items) => [...items, candidate.standardId]);
    toast(`${candidate.subjectName} · ${candidate.areaName} · ${candidate.standardCode}를 추가했습니다.`);
  };

  const removeStandard = (id: string) => {
    setSelectedStandardIds((items) => items.filter((item) => item !== id));
    setRatings((items) =>
      Object.fromEntries(Object.entries(items).filter(([key]) => !key.endsWith(`::${id}`))),
    );
    setResults((items) => items.filter((item) => item.standardId !== id));
    setSummary({});
  };

  const updateResult = (id: string, patch: Partial<GeneratedSentence>) =>
    setResults((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast("클립보드에 복사했습니다.");
  };
  const makeSummaries = () => {
    const next: Record<string, string> = {};
    students.forEach((student) => {
      next[student.id] = results
        .filter((item) => item.studentId === student.id)
        .map((item) => item.sentence)
        .join(" ");
    });
    setSummary(next);
    toast("학생별 여러 과목 평어를 선택한 기준 순서대로 연결했습니다.");
  };

  const generate = async () => {
    if (!selectedStandards.length || !students.length) {
      return toast("명단과 한 개 이상의 성취기준을 먼저 확인해 주세요.");
    }
    const created: GeneratedSentence[] = [];
    const usedDrafts = [...sentenceHistory.current, ...results.map((item) => item.sentence)];
    students.forEach((student, studentIndex) => {
      selectedStandards.forEach((selectedStandard, standardIndex) => {
        const schoolLevel = ratings[cellKey(student.id, selectedStandard.standardId)];
        if (!schoolLevel) return;
        const officialLevel = officialLevelFor(schoolLevel);
        const sentence = createUniqueGroundedSentence({
          standard: selectedStandard,
          officialLevel,
          schoolLevel,
          usedSentences: usedDrafts,
          seed: student.number * 101 + standardIndex * 17 + studentIndex,
        });
        usedDrafts.push(sentence);
        created.push({
          id: crypto.randomUUID(),
          studentId: student.id,
          sentence,
          standardId: selectedStandard.standardId,
          officialLevel,
          schoolLevel,
          grounded: true,
          needsReview: false,
          reviewReason: "",
          locked: false,
          confirmed: false,
          edited: false,
          createdAt: new Date().toISOString(),
        });
      });
    });
    if (!created.length) return toast("평가단계를 한 칸 이상 입력해 주세요.");
    sentenceHistory.current = usedDrafts;
    setResults(created);
    setSummary({});
    setStep(4);

    const studentCount = new Set(created.map((item) => item.studentId)).size;
    if (!isCloudAiEnabled) {
      return toast(
        `${studentCount}명, ${created.length}개의 서로 다른 공식 원문 기반 초안을 기기에서 만들었습니다.`,
      );
    }
    if (!auth?.currentUser) {
      return toast(
        `${studentCount}명, ${created.length}개의 서로 다른 공식 원문 기반 미리보기를 만들었습니다.`,
      );
    }
    toast(`${created.length}개 평어를 AI로 생성하고 근거를 검증하고 있습니다.`);
    const accepted: string[] = [];
    for (let index = 0; index < created.length; index += 1) {
      const item = created[index];
      const selectedStandard = selectedStandards.find(
        (current) => current.standardId === item.standardId,
      );
      if (!selectedStandard) continue;
      try {
        const ai = await generateSubjectWithAi(
          buildSubjectAiRequest({
            anonymousStudentId: item.studentId ?? `student-${index}`,
            standard: selectedStandard,
            item,
            sentenceLength: "기본",
            usedSentences: [...sentenceHistory.current, ...accepted],
            diversificationSeed:
              (students.find((student) => student.id === item.studentId)?.number ?? index) * 101 +
              index,
          }),
        );
        const pool = [...sentenceHistory.current, ...accepted].filter(
          (value) => normalizeSentence(value) !== normalizeSentence(item.sentence),
        );
        const repeated = !ai.sentence || isSubjectSentenceTooSimilar(ai.sentence, pool);
        const sentence = ai.sentence && !repeated ? ai.sentence : item.sentence;
        accepted.push(sentence);
        updateResult(item.id, {
          sentence,
          grounded: ai.grounded && !repeated,
          needsReview: ai.needsReview || repeated,
          reviewReason: repeated
            ? "다른 문장과 같아 서로 다른 기기 초안으로 교체했습니다."
            : ai.reviewReason,
        });
      } catch {
        accepted.push(item.sentence);
        updateResult(item.id, {
          needsReview: true,
          reviewReason: "AI 생성 실패: 기기 초안은 유지되었습니다.",
        });
      }
    }
    sentenceHistory.current = [...sentenceHistory.current, ...accepted];
    toast("우리 반 평어의 AI 생성과 검증을 마쳤습니다.");
  };

  const regenerate = async (
    item: GeneratedSentence,
    selectedStandard: CurriculumStandard,
    seed: number,
  ) => {
    regenerationSeed.current += 1;
    const usedSentences = [
      ...sentenceHistory.current,
      ...results.filter((current) => current.id !== item.id).map((current) => current.sentence),
      item.sentence,
    ];
    const fallback = createUniqueGroundedSentence({
      standard: selectedStandard,
      officialLevel: item.officialLevel,
      schoolLevel: item.schoolLevel,
      usedSentences,
      seed: seed + regenerationSeed.current,
    });
    sentenceHistory.current.push(fallback);
    updateResult(item.id, { sentence: fallback, grounded: true, needsReview: false, reviewReason: "" });
    if (!isCloudAiEnabled || !auth?.currentUser) {
      return toast("기존 전체 결과와 겹치지 않는 문장으로 다시 만들었습니다.");
    }
    try {
      const ai = await generateSubjectWithAi(
        buildSubjectAiRequest({
          anonymousStudentId: item.studentId ?? `student-${seed}`,
          standard: selectedStandard,
          item,
          sentenceLength: "기본",
          usedSentences,
          diversificationSeed: seed + regenerationSeed.current,
        }),
      );
      const repeated = !ai.sentence || isSubjectSentenceTooSimilar(ai.sentence, usedSentences);
      updateResult(
        item.id,
        repeated
          ? {
              sentence: fallback,
              grounded: true,
              needsReview: true,
              reviewReason:
                "AI 문장이 기존 결과와 같거나 지나치게 비슷해 서로 다른 기기 초안을 유지했습니다.",
            }
          : {
              sentence: ai.sentence,
              grounded: ai.grounded,
              needsReview: ai.needsReview,
              reviewReason: ai.reviewReason,
            },
      );
      if (!repeated) sentenceHistory.current.push(ai.sentence);
      toast(
        repeated
          ? "중복을 차단하고 서로 다른 문장으로 다시 만들었습니다."
          : "기존 결과와 겹치지 않는 새 문장으로 바꿨습니다.",
      );
    } catch {
      toast("AI 응답이 지연되어 중복 없는 기기 초안을 유지했습니다.");
    }
  };

  const setDefaultRatings = () => {
    const value = levels[Math.floor(levels.length / 2)];
    setRatings(
      Object.fromEntries(
        students.flatMap((student) =>
          selectedStandards.map((s) => [cellKey(student.id, s.standardId), value]),
        ),
      ),
    );
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeading
        eyebrow="교과평어"
        title="우리 반 평어 작성"
        description="여러 과목과 성취기준을 고른 뒤 학생별 평가단계를 한 표에서 입력하세요."
        icon={Users}
      />
      <Stepper steps={STEP_LABELS} current={step} onStepClick={setStep} />

      {step === 1 && (
        <GlassPanel>
          <AssessmentPlanStart
            mode={planMode}
            setMode={setPlanMode}
            savedPlan={savedPlan}
            onStandardsChange={handlePlanStandards}
            onSavePlan={onSavePlan}
            toast={toast}
          />
          {planMode !== "choose" && (planMode === "manual" || selectedStandards.length > 0) && (
            <div className="mt-6 border-t border-line pt-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">
                  2
                </span>
                <div>
                  <b>평가 단계 설정</b>
                  <small className="block text-[11px] text-muted">
                    3·4·5단계가 뜻하는 바를 학교 평가계획에 맞게 선택하세요.
                  </small>
                </div>
              </div>
              <Segmented
                label="평가 단계 설정"
                options={[3, 4, 5] as const}
                value={levelCount}
                onChange={(value) => setLevelCount(value)}
                renderLabel={(count) => `${count}단계`}
              />

              {planMode === "manual" && (
                <>
                  <div className="mt-6 mb-3 flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-white">
                      3
                    </span>
                    <div>
                      <b>평가 내용 설정</b>
                      <small className="block text-[11px] text-muted">
                        학년·과목·평가영역·성취기준을 고른 뒤 표에 추가하세요.
                      </small>
                    </div>
                  </div>
                  <CurriculumPicker
                    {...{ grade, setGrade, subject, setSubject, area, setArea, standardId, setStandardId }}
                  />
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                      <b>선택한 기준을 평가표에 추가하세요</b>
                      <span className="text-[11px] text-muted">
                        과목을 바꿔 다시 선택하면 여러 과목을 한 번에 평가할 수 있습니다.
                      </span>
                    </div>
                    <Button variant="primary" onClick={() => addStandard()}>
                      <Plus size={16} /> 성취기준 추가
                    </Button>
                  </div>
                </>
              )}

              <div className="mt-3.5 rounded-2xl border border-line bg-solid/45 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <b>{planMode === "plan" ? "평가계획에서 불러온 성취기준" : "평가할 성취기준"}</b>
                  <span className="text-[11px] font-extrabold text-primary-dark">
                    {selectedStandards.length} / 12개
                  </span>
                </div>
                {selectedStandards.length ? (
                  selectedStandards.map((selectedStandard, index) => (
                    <article
                      key={selectedStandard.standardId}
                      className="grid grid-cols-[30px_minmax(0,1fr)_44px] items-center gap-2.5 border-t border-line py-2.5"
                    >
                      <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-[11px] font-black text-primary-dark">
                        {index + 1}
                      </span>
                      <div>
                        <b className="text-xs">
                          {selectedStandard.subjectName} · {selectedStandard.areaName}
                        </b>
                        <p className="mt-0.5 text-[11px] leading-normal text-muted">
                          [{selectedStandard.standardCode}] {selectedStandard.standardText}
                        </p>
                      </div>
                      <button
                        className="grid place-items-center text-muted"
                        aria-label={`${selectedStandard.standardCode} 삭제`}
                        onClick={() => removeStandard(selectedStandard.standardId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="grid min-h-[80px] place-items-center text-xs text-muted">
                    성취기준을 한 개 이상 추가해 주세요.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  disabled={!selectedStandards.length}
                  onClick={() => setStep(2)}
                >
                  명단 입력으로 <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          )}
        </GlassPanel>
      )}

      {step === 2 && (
        <GlassPanel>
          <RosterInput students={students} setStudents={setStudents} toast={toast} />
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-success/10 p-3.5 text-success">
            <BookOpen size={18} />
            <p className="text-xs">
              <b>실명은 현재 기기에만 저장됩니다.</b> 클라우드에는 학생 번호와 임의 ID만 저장하며 외부
              AI로 전송하지 않습니다.
            </p>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft size={17} /> 이전
            </Button>
            <Button
              variant="primary"
              disabled={!students.length || !selectedStandards.length}
              onClick={() => setStep(3)}
            >
              평가 입력으로 <ChevronRight size={17} />
            </Button>
          </div>
        </GlassPanel>
      )}

      {step === 3 && (
        <GlassPanel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">학생별 평가단계</h2>
              <p className="mt-1 text-xs text-muted">
                {students.length}명 × {selectedStandards.length}개 기준 · 총 {totalCells}칸
              </p>
            </div>
            <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-xs font-extrabold">
              {progress}%
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto rounded-2xl border border-line">
            <table className="w-full border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-primary-soft p-2">번호</th>
                  <th className="sticky top-0 z-20 bg-primary-soft p-2">이름</th>
                  {selectedStandards.map((s) => (
                    <th
                      key={s.standardId}
                      className="sticky top-0 z-10 min-w-[200px] bg-primary-soft p-2"
                    >
                      <b className="block">{s.subjectName}</b>
                      <small className="block font-normal text-muted">{s.areaName}</small>
                      <small className="block font-normal text-muted">{s.standardCode}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="sticky left-0 z-10 border-b border-line bg-solid/80 p-2">
                      {student.number}
                    </td>
                    <th className="border-b border-line bg-solid/80 p-2">
                      {privacy ? maskName(student.name) : student.name}
                    </th>
                    {selectedStandards.map((s) => {
                      const key = cellKey(student.id, s.standardId);
                      return (
                        <td key={s.standardId} className="border-b border-line p-2">
                          <select
                            aria-label={`${student.name} ${s.subjectName} ${s.areaName} 평가단계`}
                            className="w-[min(190px,100%)]"
                            value={ratings[key] ?? ""}
                            onChange={(event) =>
                              setRatings({ ...ratings, [key]: event.target.value as SchoolLevel })
                            }
                          >
                            <option value="">단계 선택</option>
                            {levels.map((level) => (
                              <option key={level}>{level}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft size={17} /> 이전
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={setDefaultRatings}>
                전체 기본값
              </Button>
              <Button variant="primary" disabled={!completedCells} onClick={() => void generate()}>
                <Sparkles size={17} /> {completedCells}개 평어 생성
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}

      {step === 4 && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">학생별 평어 검토</h2>
              <p className="mt-1 text-muted">
                {new Set(results.map((item) => item.studentId)).size}명 · {results.length}개 문장 ·
                교사가 수정한 문장은 자동으로 잠깁니다.
              </p>
            </div>
            <Button variant="primary" onClick={makeSummaries}>
              <BookOpen size={17} /> 학기말 종합의견
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {students.map((student) => {
              const studentItems = results.filter((item) => item.studentId === student.id);
              if (!studentItems.length) return null;
              return (
                <div
                  key={student.id}
                  className="grid gap-3 rounded-2xl border border-line bg-card p-3 sm:grid-cols-[110px_1fr]"
                >
                  <div className="flex flex-col items-center justify-center rounded-xl bg-primary-soft p-2 text-center">
                    <span className="text-xs text-primary">{student.number}</span>
                    <b className="mt-1">{privacy ? maskName(student.name) : student.name}</b>
                    <small className="mt-1 text-[10px] text-muted">
                      {studentItems.length}개 평어
                    </small>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2.5">
                    {studentItems.map((item, index) => {
                      const selectedStandard = selectedStandards.find(
                        (current) => current.standardId === item.standardId,
                      );
                      if (!selectedStandard) return null;
                      return (
                        <SentenceEditor
                          key={item.id}
                          item={item}
                          standard={selectedStandard}
                          onChange={(patch) => updateResult(item.id, patch)}
                          onRegenerate={() =>
                            void regenerate(
                              item,
                              selectedStandard,
                              index + student.number * 31,
                            )
                          }
                          onCopy={() => copy(item.sentence)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {Object.keys(summary).length > 0 && (
            <div className="mt-6 rounded-2xl border border-line bg-card p-6">
              <h2 className="text-xl font-bold">학기말 종합의견</h2>
              <p className="text-xs text-muted">
                새로운 사실을 추가하지 않고 학생별 여러 과목 평어를 선택한 순서대로 연결했습니다.
              </p>
              {students
                .filter((student) => summary[student.id])
                .map((student) => (
                  <div
                    key={student.id}
                    className="mt-3 grid items-center gap-2.5 sm:grid-cols-[140px_1fr_auto]"
                  >
                    <div className="flex flex-col">
                      <b>
                        {student.number}. {privacy ? maskName(student.name) : student.name}
                      </b>
                      <span className="text-[10px] text-muted">
                        {summary[student.id].length}자 · {utf8Bytes(summary[student.id])}바이트
                      </span>
                    </div>
                    <textarea
                      className="min-h-[88px]"
                      value={summary[student.id]}
                      onChange={(event) =>
                        setSummary({ ...summary, [student.id]: event.target.value })
                      }
                    />
                    <Button variant="ghost" size="sm" onClick={() => copy(summary[student.id])}>
                      복사
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
