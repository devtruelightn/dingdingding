"use client";

import { useMemo, useRef, useState } from "react";
import { Clipboard, Download, List, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { CurriculumPicker } from "@/components/curriculum/CurriculumPicker";
import { Button, Card, PageHeading, Segmented } from "@/components/ui";
import {
  AssessmentPlanStart,
  type PlanSetupMode,
} from "@/features/assessment-plan";
import {
  defaultSelectionFor,
  hasCurriculumFor,
  officialLevelFor,
  schoolLevelsFor,
  standards,
} from "@/lib/curriculum";
import { analyzePerformanceFile, type PerformanceRow } from "@/lib/files";
import { subjectMenuLabel } from "@/lib/school";
import { auth, generateSubjectWithAi, isCloudAiEnabled } from "@/lib/firebase";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/cn";
import {
  createPerformanceDraft,
  createUniqueGroundedSentence,
  csvCell,
  isSubjectSentenceTooSimilar,
  normalizeSentence,
} from "@/lib/text";
import type {
  CurriculumStandard,
  GeneratedSentence,
  SavedAssessmentPlan,
  SchoolLevel,
  TeacherProfile,
} from "@/types";
import { SentenceEditor } from "./components/SentenceEditor";
import { StudentDraftList } from "./components/StudentDraftList";
import { downloadStudentDraftWorkbook } from "./subjectExport";
import { buildSubjectAiRequest } from "./subjectAi";

interface QuickSubjectProps {
  /** 진입 화면에서 고른 학교급·학년. AI 프롬프트 팩 선택에 쓴다. */
  profile: TeacherProfile;
  toast: (message: string) => void;
  savedPlan: SavedAssessmentPlan | null;
  onSavePlan: (plan: SavedAssessmentPlan) => Promise<void>;
}

const lengthOptions = ["간결하게", "기본", "자세하게"] as const;

/** 학생 명단 없이 성취기준별 평어 묶음을 만드는 화면. */
export function QuickSubject({ profile, toast, savedPlan, onSavePlan }: QuickSubjectProps) {
  // 초등은 "평어", 중·고등은 "과세특"으로 부른다.
  const menuLabel = subjectMenuLabel(profile.schoolLevel);
  // 진입 흐름에서 고른 학교급·학년이 그대로 첫 선택값이 된다.
  const initial = useMemo(
    () => defaultSelectionFor(profile.schoolLevel, profile.grade),
    [profile.schoolLevel, profile.grade],
  );
  const standardsReady = hasCurriculumFor(profile.schoolLevel);
  const [planMode, setPlanMode] = useState<PlanSetupMode>("choose");
  const [grade, setGrade] = useState(initial.grade);
  const [levelCount, setLevelCount] = useState<3 | 4 | 5>(3);
  const [subject, setSubject] = useState(initial.subject);
  const [area, setArea] = useState(initial.area);
  const [standardId, setStandardId] = useState("");
  const [length, setLength] = useState<string>("기본");
  const [counts, setCounts] = useState<Record<string, number>>({ 잘함: 3, 보통: 2, 노력요함: 1 });
  const [results, setResults] = useState<GeneratedSentence[]>([]);
  const [activeResultLevel, setActiveResultLevel] = useState<SchoolLevel | null>(null);
  const [planStandardIds, setPlanStandardIds] = useState<string[]>([]);
  const regenerationSeed = useRef(0);
  const sentenceHistory = useRef<string[]>([]);
  /** 수행평가 자료로 만든 학생별 세특 초안 (고등학교에서만 쓴다). */
  const [performanceDrafts, setPerformanceDrafts] = useState<Record<string, string>>({});
  const [performanceNumbers, setPerformanceNumbers] = useState<{ id: string; number: number }[]>([]);
  /** 초안 목록은 설정 화면 아래가 아니라 별도 화면으로 연다. */
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const performanceRows = useRef<Map<string, PerformanceRow>>(new Map());
  const performanceVariant = useRef<Map<string, number>>(new Map());

  /** 수행평가 정리 파일을 읽어 학생이 쓴 내용만으로 세특 초안을 만든다. */
  const usePerformanceFile = async (file: File) => {
    let rows;
    try {
      rows = await analyzePerformanceFile(file);
    } catch (error) {
      return toast(error instanceof Error ? error.message : "수행평가 파일을 분석하지 못했습니다.");
    }
    const drafts = rows
      .map((row) => ({ row, text: createPerformanceDraft(row) }))
      .filter((draft) => draft.text);
    if (!drafts.length) return toast("학생이 작성한 내용을 찾지 못했습니다.");
    performanceRows.current = new Map(drafts.map(({ row }) => [`s-${row.number}`, row]));
    performanceVariant.current = new Map();
    // 이름은 담지 않는다. 번호만 쓴다.
    setPerformanceNumbers(drafts.map(({ row }) => ({ id: `s-${row.number}`, number: row.number })));
    setPerformanceDrafts(
      Object.fromEntries(drafts.map(({ row, text }) => [`s-${row.number}`, text])),
    );
    setPerformanceOpen(true);
    toast(`${drafts.length}명의 수행평가 자료로 세특 초안을 만들었습니다.`);
  };

  const regeneratePerformance = (entry: { id: string; number: number }) => {
    const row = performanceRows.current.get(entry.id);
    if (!row) return;
    const variant = (performanceVariant.current.get(entry.id) ?? 0) + 1;
    performanceVariant.current.set(entry.id, variant);
    const text = createPerformanceDraft(row, { variant });
    if (!text) return;
    setPerformanceDrafts((current) => ({ ...current, [entry.id]: text }));
    toast(`${entry.number}번 세특 초안을 다시 만들었습니다.`);
  };

  /** 업로드한 평가계획으로 만든 기준은 내장 배열에 없어 따로 들고 본다. */
  const [uploadedStandards, setUploadedStandards] = useState<Record<string, CurriculumStandard>>({});
  const findStandard = (id: string) =>
    uploadedStandards[id] ?? standards.find((item) => item.standardId === id);
  const standard = findStandard(standardId);
  const planStandards = planStandardIds
    .map(findStandard)
    .filter((item): item is CurriculumStandard => Boolean(item));
  const levels = schoolLevelsFor(levelCount);

  const selectStandard = (selected: CurriculumStandard) => {
    if (!selected.uploaded) setGrade(Number(selected.standardCode[0]));
    setSubject(selected.subjectName);
    setArea(selected.areaName);
    setStandardId(selected.standardId);
  };
  const handlePlanStandards = (selected: CurriculumStandard[]) => {
    setUploadedStandards(
      Object.fromEntries(selected.filter((item) => item.uploaded).map((item) => [item.standardId, item])),
    );
    setPlanStandardIds(selected.map((item) => item.standardId));
    const current = selected.find((item) => item.standardId === standardId) ?? selected[0];
    if (current) selectStandard(current);
  };

  const updateResult = (id: string, patch: Partial<GeneratedSentence>) =>
    setResults((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast("클립보드에 복사했습니다.");
  };
  const exportCsv = () =>
    downloadText(
      "아주나이스_평어묶음.csv",
      [
        "평가단계,공식수준,성취기준,평어",
        ...results.map((item) =>
          [item.schoolLevel, item.officialLevel, item.standardId, item.sentence]
            .map(csvCell)
            .join(","),
        ),
      ].join("\n"),
      "text/csv;charset=utf-8",
    );

  const generate = async () => {
    if (!standard) return;
    const next: GeneratedSentence[] = [];
    const usedDrafts = [...sentenceHistory.current, ...results.map((item) => item.sentence)];
    levels.forEach((schoolLevel, levelIndex) => {
      const amount = Math.min(10, Math.max(0, counts[schoolLevel] ?? 0));
      for (let index = 0; index < amount; index += 1) {
        const officialLevel = officialLevelFor(schoolLevel);
        const sentence = createUniqueGroundedSentence({
          standard,
          officialLevel,
          schoolLevel,
          usedSentences: usedDrafts,
          seed: levelIndex * 101 + index,
        });
        usedDrafts.push(sentence);
        next.push({
          id: crypto.randomUUID(),
          sentence,
          standardId: standard.standardId,
          officialLevel,
          schoolLevel,
          grounded: true,
          needsReview: schoolLevel.startsWith("매우 "),
          reviewReason: schoolLevel.startsWith("매우 ")
            ? "공식 A·B·C 안에서 강도만 조정했는지 확인하세요."
            : "",
          locked: false,
          confirmed: false,
          edited: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    sentenceHistory.current = usedDrafts;
    setResults(next);
    setActiveResultLevel(next[0]?.schoolLevel ?? null);

    if (!isCloudAiEnabled) {
      toast(
        `${next.length}개의 공식 원문 기반 초안을 기기에서 만들었습니다. 무료 모드에서는 외부 AI로 전송하지 않습니다.`,
      );
      return;
    }
    if (!auth?.currentUser) {
      toast(
        `${next.length}개의 공식 원문 기반 미리보기를 만들었습니다. AI 기능을 사용할 때는 로그인이 필요합니다.`,
      );
      return;
    }
    toast(`${next.length}개 문장을 AI 근거 검증과 함께 생성하고 있습니다.`);
    const accepted: string[] = [];
    for (let index = 0; index < next.length; index += 1) {
      const item = next[index];
      try {
        const ai = await generateSubjectWithAi(
          buildSubjectAiRequest({
            anonymousStudentId: `quick-${item.id}`,
            standard,
            item,
            sentenceLength: length,
            usedSentences: [...sentenceHistory.current, ...accepted],
            diversificationSeed: index,
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
            ? "AI 문장이 앞 문장과 같아 서로 다른 기기 초안으로 교체했습니다."
            : ai.reviewReason,
        });
      } catch {
        accepted.push(item.sentence);
        updateResult(item.id, {
          needsReview: true,
          reviewReason: "AI 호출이 지연되거나 한도를 초과했습니다. 기기 초안은 유지됩니다.",
        });
      }
    }
    sentenceHistory.current = [...sentenceHistory.current, ...accepted];
    toast("AI 생성과 근거 검증을 마쳤습니다.");
  };

  const regenerate = async (item: GeneratedSentence, index: number) => {
    if (!standard) return;
    regenerationSeed.current += 1;
    const usedSentences = [
      ...sentenceHistory.current,
      ...results.filter((current) => current.id !== item.id).map((current) => current.sentence),
      item.sentence,
    ];
    const sentence = createUniqueGroundedSentence({
      standard,
      officialLevel: item.officialLevel,
      schoolLevel: item.schoolLevel,
      usedSentences,
      seed: index + regenerationSeed.current,
    });
    sentenceHistory.current.push(sentence);
    updateResult(item.id, { sentence, grounded: true, needsReview: false, reviewReason: "" });
    if (!isCloudAiEnabled || !auth?.currentUser || standard.uploaded) {
      toast("같은 성취수준 안에서 다른 문장 구조로 다시 만들었습니다.");
      return;
    }
    try {
      const ai = await generateSubjectWithAi(
        buildSubjectAiRequest({
          anonymousStudentId: `quick-${item.id}`,
          standard,
          item,
          sentenceLength: length,
          usedSentences,
          diversificationSeed: regenerationSeed.current,
          profile,
        }),
      );
      const repeated = !ai.sentence || isSubjectSentenceTooSimilar(ai.sentence, usedSentences);
      updateResult(
        item.id,
        repeated
          ? {
              sentence,
              grounded: true,
              needsReview: true,
              reviewReason: "AI 문장이 기존 문장과 같아 서로 다른 기기 초안을 유지했습니다.",
            }
          : {
              sentence: ai.sentence,
              grounded: ai.grounded,
              needsReview: ai.needsReview,
              reviewReason: ai.reviewReason,
            },
      );
      if (!repeated) sentenceHistory.current.push(ai.sentence);
      toast(repeated ? "중복을 피한 기기 초안으로 다시 만들었습니다." : "해당 문장을 AI로 새롭게 만들었습니다.");
    } catch {
      toast("AI 응답이 지연되어 서로 다른 기기 초안을 유지했습니다.");
    }
  };

  const resultLevels = levels.filter((level) => results.some((item) => item.schoolLevel === level));
  const visibleResults = activeResultLevel
    ? results.filter((item) => item.schoolLevel === activeResultLevel)
    : results;

  if (performanceOpen && performanceNumbers.length > 0)
    return (
      <div className="mx-auto max-w-[1120px]">
        <button
          type="button"
          onClick={() => setPerformanceOpen(false)}
          className="mb-4 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-primary-soft hover:text-ink"
        >
          ← 자료 다시 올리기
        </button>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">학생별 {menuLabel}</h2>
            <p className="mt-1 text-muted">
              학생이 수행평가에 쓴 내용만 간추린 초안입니다. 이름은 넣지 않았으니 확인 후 다듬어
              쓰세요.
            </p>
          </div>
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() =>
              void downloadStudentDraftWorkbook(menuLabel, performanceNumbers, performanceDrafts)
            }
          >
            <Download size={17} /> 엑셀로 내려받기
          </Button>
        </div>
        <StudentDraftList
          numbers={performanceNumbers}
          texts={performanceDrafts}
          label={menuLabel}
          onChange={(id, value) => setPerformanceDrafts((current) => ({ ...current, [id]: value }))}
          onCopy={copy}
          onRegenerate={regeneratePerformance}
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeading
        eyebrow={`교과${menuLabel}`}
        title={`${menuLabel} 빠른 생성`}
        description="학생 명단 없이 성취기준별 문장 묶음을 만듭니다."
        icon={WandSparkles}
      />
      <Card>
        <AssessmentPlanStart
          mode={planMode}
          setMode={setPlanMode}
          savedPlan={savedPlan}
          onStandardsChange={handlePlanStandards}
          onSavePlan={onSavePlan}
          onPerformanceFile={
            profile.schoolLevel === "high" ? usePerformanceFile : undefined
          }
          standardsAvailable={standardsReady}
          toast={toast}
        />
        {planMode !== "choose" && (planMode === "manual" || planStandards.length > 0) && (
          <div className="mt-6 border-t border-line pt-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                2
              </span>
              <div>
                <b>평가 내용 설정</b>
                <small className="block text-xs text-muted">
                  {planMode === "plan"
                    ? "평가계획에서 불러온 항목을 확인하세요."
                    : "학년·과목·평가영역·성취기준을 직접 선택하세요."}
                </small>
              </div>
            </div>
            {planMode === "plan" ? (
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold">업로드된 평가항목</span>
                <select
                  value={standardId}
                  onChange={(event) => {
                    const selected = planStandards.find(
                      (item) => item.standardId === event.target.value,
                    );
                    if (selected) selectStandard(selected);
                  }}
                >
                  {planStandards.map((item) => (
                    <option key={item.standardId} value={item.standardId}>
                      {item.subjectName} · {item.areaName} · [{item.standardCode}]
                    </option>
                  ))}
                </select>
                <small className="text-xs text-primary-dark">
                  {grade}학년 · {subject} · {area} 자동 설정됨
                </small>
              </label>
            ) : (
              <CurriculumPicker
                schoolLevel={profile.schoolLevel}
                {...{ grade, setGrade, subject, setSubject, area, setArea, standardId, setStandardId }}
              />
            )}

            <div className="mt-6 mb-3 flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                3
              </span>
              <div>
                <b>평가 단계 설정</b>
                <small className="block text-xs text-muted">
                  학교에서 사용하는 3·4·5단계 중 하나를 고르세요.
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

            <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold">문장 길이</span>
                <select value={length} onChange={(event) => setLength(event.target.value)}>
                  {lengthOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                {levels.map((level) => (
                  <label key={level} className="flex min-w-[90px] flex-col gap-2">
                    <span className="text-xs font-bold">{level}</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="w-[90px]"
                      value={counts[level] ?? 0}
                      onChange={(event) =>
                        setCounts({ ...counts, [level]: Number(event.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-success">
                <ShieldCheck size={16} /> 공식 성취수준 원문만 교육내용 근거로 사용합니다.
              </p>
              <Button variant="primary" size="lg" disabled={!standard} onClick={() => void generate()}>
                <Sparkles size={18} /> 평어 생성
              </Button>
            </div>
          </div>
        )}
      </Card>

      {performanceNumbers.length > 0 && (
        <div className="mt-6">
          <Button onClick={() => setPerformanceOpen(true)}>
            <List size={17} /> 학생별 {menuLabel} 다시 보기
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">생성 결과</h2>
              <p className="mt-1 text-muted">
                평가단계를 눌러 수준별 문장을 확인하고, 목록을 위에서 아래로 검토하세요.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => copy(results.map((item) => item.sentence).join("\n"))}
              >
                <Clipboard size={17} /> 전체 복사
              </Button>
              <Button variant="ghost" onClick={exportCsv}>
                <Download size={17} /> CSV
              </Button>
            </div>
          </div>
          <div
            role="tablist"
            aria-label="평가단계별 결과"
            className="mb-4 flex flex-wrap gap-1 rounded-full border border-line bg-subtle p-1"
          >
            {resultLevels.map((level) => (
              <button
                key={level}
                role="tab"
                aria-selected={activeResultLevel === level}
                onClick={() => setActiveResultLevel(level)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-150",
                  activeResultLevel === level
                    ? "border-line bg-card text-primary-dark shadow-soft"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                <span>{level}</span>
                <b className="grid min-w-6 place-items-center rounded-full bg-primary-soft px-2 text-xs text-primary-dark">
                  {results.filter((item) => item.schoolLevel === level).length}
                </b>
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {visibleResults.map(
              (item) =>
                standard && (
                  <SentenceEditor
                    key={item.id}
                    item={item}
                    standard={standard}
                    onChange={(patch) => updateResult(item.id, patch)}
                    onRegenerate={() =>
                      void regenerate(
                        item,
                        results.findIndex((current) => current.id === item.id),
                      )
                    }
                    onCopy={() => copy(item.sentence)}
                  />
                ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
