"use client";

import { useRef, useState, type ReactNode } from "react";
import { BookOpen, Clipboard, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { CurriculumPicker } from "@/components/curriculum/CurriculumPicker";
import { Button, GlassPanel, Segmented } from "@/components/ui";
import { AssessmentPlanStart, type PlanSetupMode } from "@/features/assessment-plan";
import { officialLevelFor, schoolLevelsFor, standards } from "@/lib/curriculum";
import { analyzeAssessmentResults } from "@/lib/files";
import { subjectMenuLabel } from "@/lib/school";
import { auth, generateSubjectWithAi, isCloudAiEnabled } from "@/lib/firebase";
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
  TeacherProfile,
} from "@/types";
import { SentenceEditor } from "./components/SentenceEditor";
import { buildSubjectAiRequest } from "./subjectAi";

/**
 * 한 작업에 담을 수 있는 성취기준 수. 한 학기 전 과목 평가계획을 통째로 올리면
 * 30개 안팎이 나오므로 여유를 두고 잡는다. 평가표는 학생 × 기준으로 넓어지니
 * 무제한으로 두지는 않는다.
 */
const MAX_STANDARDS = 40;

interface ClassSubjectProps {
  /** 진입 화면에서 고른 학교급·학년. AI 프롬프트 팩 선택에 쓴다. */
  profile: TeacherProfile;
  toast: (message: string) => void;
  savedPlan: SavedAssessmentPlan | null;
  onSavePlan: (plan: SavedAssessmentPlan) => Promise<void>;
}

/** 단계 이동 버튼 한 줄. 왼쪽은 이전, 오른쪽은 다음(+부가 액션). */
function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "다음",
  children,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-primary-soft/50 hover:text-ink"
        >
          ← 이전
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {children}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  );
}

/** 명단 × 여러 성취기준 평가표로 학생별 평어를 한 번에 작성하는 화면. */
export function ClassSubject({ profile, toast, savedPlan, onSavePlan }: ClassSubjectProps) {
  // 초등은 "평어", 중·고등은 "과세특"으로 부른다.
  const menuLabel = subjectMenuLabel(profile.schoolLevel);
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
  /** 종합의견을 다시 만드는 중인 학생. 그 줄의 버튼만 잠근다. */
  const [regeneratingId, setRegeneratingId] = useState("");

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
    const compatible = selected
      .filter((item) => item.gradeBand === gradeBand)
      .slice(0, MAX_STANDARDS);
    const first = compatible[0];
    setSelectedStandardIds(compatible.map((item) => item.standardId));
    setGrade(Number(first.standardCode[0]));
    setSubject(first.subjectName);
    setArea(first.areaName);
    setStandardId(first.standardId);
    setRatings({});
    setResults([]);
    setSummary({});
    // 잘린 이유가 학년군 때문인지 개수 상한 때문인지 구분해서 알린다.
    const sameBand = selected.filter((item) => item.gradeBand === gradeBand).length;
    if (sameBand > MAX_STANDARDS) {
      toast(`성취기준이 ${sameBand}개라 앞에서부터 ${MAX_STANDARDS}개만 불러왔습니다.`);
    } else if (compatible.length < selected.length) {
      toast(`같은 학년군의 성취기준 ${compatible.length}개를 불러왔습니다.`);
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
    if (selectedStandardIds.length >= MAX_STANDARDS) {
      return toast(`한 작업에는 성취기준을 최대 ${MAX_STANDARDS}개까지 추가할 수 있습니다.`);
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
    setStep(5);
    toast("학생별 여러 과목 평어를 선택한 기준 순서대로 연결했습니다.");
  };

  /**
   * 이미 매긴 평가결과 파일을 읽어 학기말 종합의견까지 한 번에 만든다.
   * 평가단계가 정해져 있으므로 명단·평가표 단계를 건너뛴다.
   */
  const useResultFile = async (file: File) => {
    let rows;
    try {
      rows = await analyzeAssessmentResults(file, standards);
    } catch (error) {
      return toast(error instanceof Error ? error.message : "평가결과 파일을 분석하지 못했습니다.");
    }
    const matched = rows.filter((row) => row.standard);
    if (!matched.length) {
      return toast("공식 성취기준과 연결되는 항목을 찾지 못했습니다.");
    }

    // 번호 순으로 명단을 세우고, 등장한 성취기준을 평가표 열로 삼는다.
    const numbers = [...new Set(matched.map((row) => row.number))].sort((a, b) => a - b);
    const nextStudents: Student[] = numbers.map((number) => ({
      id: `s-${number}`,
      number,
      name: matched.find((row) => row.number === number)?.name ?? `${number}번`,
    }));
    const nextStandards = [...new Map(matched.map((row) => [row.standard!.standardId, row.standard!])).values()];

    const created: GeneratedSentence[] = [];
    const usedDrafts: string[] = [];
    const nextRatings: Record<string, SchoolLevel> = {};
    matched.forEach((row, index) => {
      const standard = row.standard!;
      const officialLevel = officialLevelFor(row.schoolLevel);
      nextRatings[cellKey(`s-${row.number}`, standard.standardId)] = row.schoolLevel;
      const sentence = createUniqueGroundedSentence({
        standard,
        officialLevel,
        schoolLevel: row.schoolLevel,
        usedSentences: usedDrafts,
        seed: row.number * 101 + index,
      });
      usedDrafts.push(sentence);
      created.push({
        id: crypto.randomUUID(),
        studentId: `s-${row.number}`,
        sentence,
        standardId: standard.standardId,
        officialLevel,
        schoolLevel: row.schoolLevel,
        grounded: true,
        needsReview: false,
        reviewReason: "",
        locked: false,
        confirmed: false,
        edited: false,
        createdAt: new Date().toISOString(),
      });
    });

    sentenceHistory.current = usedDrafts;
    setStudents(nextStudents);
    setSelectedStandardIds(nextStandards.map((standard) => standard.standardId));
    // "매우 잘함"처럼 5단계에서만 쓰는 이름이 있으면 5단계 척도로 본다.
    setLevelCount(matched.some((row) => row.schoolLevel.startsWith("매우")) ? 5 : 3);
    setRatings(nextRatings);
    setResults(created);
    setSummary(
      Object.fromEntries(
        nextStudents.map((student) => [
          student.id,
          created
            .filter((item) => item.studentId === student.id)
            .map((item) => item.sentence)
            .join(" "),
        ]),
      ),
    );
    setStep(5);

    const skipped = rows.length - matched.length;
    toast(
      `${nextStudents.length}명 · 성취기준 ${nextStandards.length}개로 학기말 종합의견을 만들었습니다.` +
        (skipped ? ` 공식 기준과 연결하지 못한 ${skipped}줄은 제외했습니다.` : ""),
    );
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
            profile,
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
    toast(`우리 반 ${menuLabel}의 AI 생성과 검증을 마쳤습니다.`);
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
          profile,
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

  /**
   * 한 학생의 평어를 영역마다 새로 만들어 종합의견까지 다시 잇는다.
   * 문장을 지역 변수로 모은 뒤 한 번에 반영해야 이어붙인 결과가 어긋나지 않는다.
   */
  const regenerateSummary = async (student: Student) => {
    const items = results.filter((item) => item.studentId === student.id);
    if (!items.length) return toast("다시 만들 평어가 없습니다.");
    setRegeneratingId(student.id);
    // 다른 학생의 문장과 지금까지 쓴 문장을 모두 중복 후보로 둔다.
    const used = [
      ...sentenceHistory.current,
      ...results.filter((item) => item.studentId !== student.id).map((item) => item.sentence),
    ];
    const sentences: string[] = [];
    const patches = new Map<string, Partial<GeneratedSentence>>();
    const useAi = isCloudAiEnabled && Boolean(auth?.currentUser);
    let aiFailed = false;
    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const standard = selectedStandards.find(
          (current) => current.standardId === item.standardId,
        );
        if (!standard) continue;
        regenerationSeed.current += 1;
        const seed = student.number * 31 + index + regenerationSeed.current;
        const pool = [...used, ...sentences];
        const draft = createUniqueGroundedSentence({
          standard,
          officialLevel: item.officialLevel,
          schoolLevel: item.schoolLevel,
          usedSentences: pool,
          seed,
        });
        let sentence = draft;
        let patch: Partial<GeneratedSentence> = {
          sentence: draft,
          grounded: true,
          needsReview: false,
          reviewReason: "",
        };
        if (useAi) {
          try {
            const ai = await generateSubjectWithAi(
              buildSubjectAiRequest({
                anonymousStudentId: item.studentId ?? `student-${seed}`,
                standard,
                item,
                sentenceLength: "기본",
                usedSentences: pool,
                diversificationSeed: seed,
                profile,
              }),
            );
            if (ai.sentence && !isSubjectSentenceTooSimilar(ai.sentence, pool)) {
              sentence = ai.sentence;
              patch = {
                sentence: ai.sentence,
                grounded: ai.grounded,
                needsReview: ai.needsReview,
                reviewReason: ai.reviewReason,
              };
            }
          } catch {
            // 한 문장이 실패해도 기기 초안으로 이어서 끝까지 만든다.
            aiFailed = true;
          }
        }
        sentences.push(sentence);
        patches.set(item.id, patch);
      }

      sentenceHistory.current = [...sentenceHistory.current, ...sentences];
      setResults((current) =>
        current.map((item) => {
          const patch = patches.get(item.id);
          return patch ? { ...item, ...patch } : item;
        }),
      );
      setSummary((current) => ({ ...current, [student.id]: sentences.join(" ") }));
      toast(
        aiFailed
          ? `${student.number}번 종합의견을 다시 만들었습니다. AI 응답이 지연된 문장은 기기 초안을 사용했습니다.`
          : `${student.number}번 종합의견을 ${sentences.length}개 문장으로 다시 만들었습니다.`,
      );
    } finally {
      setRegeneratingId("");
    }
  };

  const setStudentCount = (count: number) => {
    const clamped = Math.max(0, Math.min(40, Math.floor(count || 0)));
    setStudents(
      Array.from({ length: clamped }, (_, index) => ({
        id: `s-${index + 1}`,
        number: index + 1,
        name: `${index + 1}번`,
      })),
    );
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
      <h1 className="mb-6 text-2xl font-bold tracking-tight">우리 반 {menuLabel}</h1>

      {step === 1 && (
        <GlassPanel>
          <AssessmentPlanStart
            mode={planMode}
            setMode={setPlanMode}
            savedPlan={savedPlan}
            onStandardsChange={handlePlanStandards}
            onSavePlan={onSavePlan}
            onResultFile={useResultFile}
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
                    {selectedStandards.length} / {MAX_STANDARDS}개
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

              <StepNav
                onNext={() => setStep(2)}
                nextDisabled={!selectedStandards.length}
                nextLabel="명단 입력"
              />
            </div>
          )}
        </GlassPanel>
      )}

      {step === 2 && (
        <GlassPanel>
          <div className="mb-1">
            <b>학생 수</b>
            <small className="block text-[11px] text-muted">
              평가할 학생 인원만 입력하세요. 1번부터 번호가 자동으로 매겨집니다.
            </small>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[10, 15, 20, 25, 30].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setStudentCount(count)}
                className={
                  students.length === count
                    ? "rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-primary-soft/50"
                }
              >
                {count}명
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={40}
              value={students.length || ""}
              onChange={(event) => setStudentCount(Number(event.target.value))}
              aria-label="학생 수 직접 입력"
              className="w-24"
              placeholder="직접"
            />
          </div>
          {students.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              1번 ~ {students.length}번, 총 {students.length}명
            </p>
          )}
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!students.length || !selectedStandards.length}
            nextLabel="평가 입력"
          />
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
                    <th className="sticky left-0 z-10 border-b border-line bg-solid/80 p-2">
                      {student.number}번
                    </th>
                    {selectedStandards.map((s) => {
                      const key = cellKey(student.id, s.standardId);
                      return (
                        <td key={s.standardId} className="border-b border-line p-2">
                          <select
                            aria-label={`${student.number}번 ${s.subjectName} ${s.areaName} 평가단계`}
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
          <StepNav onBack={() => setStep(2)}>
            <Button variant="ghost" onClick={setDefaultRatings}>
              전체 기본값
            </Button>
            <Button variant="primary" disabled={!completedCells} onClick={() => void generate()}>
              <Sparkles size={17} /> {completedCells}개 평어 생성
            </Button>
          </StepNav>
        </GlassPanel>
      )}

      {step === 4 && (
        <section>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="mb-4 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-primary-soft/50 hover:text-ink"
          >
            ← 평가 입력으로
          </button>
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
                    <b>{student.number}번</b>
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
                            void regenerate(item, selectedStandard, index + student.number * 31)
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
        </section>
      )}

      {step === 5 && (
        <section>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="mb-4 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-primary-soft/50 hover:text-ink"
          >
            ← 학생별 평어 검토로
          </button>
          <div className="mb-4">
            <h2 className="text-2xl font-bold">학기말 종합의견</h2>
            <p className="mt-1 text-muted">
              새로운 사실을 추가하지 않고 학생별 여러 과목 평어를 선택한 순서대로 연결했습니다.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {students
              .filter((student) => summary[student.id])
              .map((student) => (
                <div
                  key={student.id}
                  className="grid items-start gap-2.5 sm:grid-cols-[140px_1fr_auto]"
                >
                  <div className="flex flex-col">
                    <b>{student.number}번</b>
                    <span className="text-[10px] text-muted">
                      {summary[student.id].length}자 · {utf8Bytes(summary[student.id])}바이트
                    </span>
                  </div>
                  <textarea
                    className="min-h-[88px] leading-relaxed"
                    value={summary[student.id]}
                    aria-label={`${student.number}번 학기말 종합의견`}
                    onChange={(event) =>
                      setSummary({ ...summary, [student.id]: event.target.value })
                    }
                  />
                  <div className="flex gap-1.5 sm:flex-col">
                    <Button variant="ghost" size="sm" onClick={() => copy(summary[student.id])}>
                      <Clipboard size={14} /> 복사
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={regeneratingId === student.id}
                      onClick={() => void regenerateSummary(student)}
                    >
                      <RefreshCw
                        size={14}
                        className={regeneratingId === student.id ? "animate-spin-slow" : undefined}
                      />
                      {regeneratingId === student.id ? "생성 중" : "다시 생성"}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
