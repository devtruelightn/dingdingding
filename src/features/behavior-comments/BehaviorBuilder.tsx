"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  MessageCircleHeart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, GlassPanel, IconButton, PageHeading } from "@/components/ui";
import { RosterInput } from "@/features/roster/RosterInput";
import { auth, generateBehaviorWithAi, isCloudAiEnabled } from "@/lib/firebase";
import { anonymizeText } from "@/lib/privacy";
import { maskName } from "@/lib/mask";
import {
  createBehaviorSentence,
  hasAwkwardBehaviorMeta,
  toRecordStyle,
  utf8Bytes,
} from "@/lib/text";
import type { Student } from "@/types";
import { KeywordPicker } from "./components/KeywordPicker";
import { behaviorDegree, categoryForKeyword } from "./keywords";

interface BehaviorBuilderProps {
  classMode?: boolean;
  privacy: boolean;
  toast: (message: string) => void;
}

interface StudentDraft {
  selected: string[];
  degrees: Record<string, string>;
  notes: string;
  snippets: string[];
  paragraph: string;
}

const DEFAULT_KEYWORDS = ["책임감", "학습 태도", "배려"];
const styleOptions = ["담백하게", "따뜻하게", "자세하게"] as const;

/** 관찰 키워드와 메모로 행동특성(행발) 문장을 만드는 화면. classMode면 학생별로 이어서 작성. */
export function BehaviorBuilder({ classMode, privacy, toast }: BehaviorBuilderProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentIndex, setStudentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>(DEFAULT_KEYWORDS);
  const [degrees, setDegrees] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [style, setStyle] = useState<string>("따뜻하게");
  const [snippets, setSnippets] = useState<string[]>([]);
  const [paragraph, setParagraph] = useState("");
  const [generationVersion, setGenerationVersion] = useState(0);
  const [refreshCounts, setRefreshCounts] = useState<Record<number, number>>({});
  const [studentDrafts, setStudentDrafts] = useState<Record<string, StudentDraft>>({});

  const currentStudent = students[studentIndex];
  const names = students.map((student) => student.name);
  const anonymized = anonymizeText(notes, names);

  const composeSnippet = (keyword: string, variant = 0) =>
    createBehaviorSentence(keyword, degrees[keyword] ?? "잘함", variant);

  const goToStudent = (nextIndex: number) => {
    if (currentStudent) {
      setStudentDrafts((items) => ({
        ...items,
        [currentStudent.id]: { selected, degrees, notes, snippets, paragraph },
      }));
    }
    const next = students[nextIndex];
    const draft = next ? studentDrafts[next.id] : undefined;
    setSelected(draft?.selected ?? DEFAULT_KEYWORDS);
    setDegrees(draft?.degrees ?? {});
    setNotes(draft?.notes ?? "");
    setSnippets(draft?.snippets ?? []);
    setParagraph(draft?.paragraph ?? "");
    setStudentIndex(nextIndex);
  };

  const generate = async () => {
    const nextVersion = generationVersion + 1;
    const built = selected.map((keyword, index) => composeSnippet(keyword, nextVersion + index));
    if (anonymized.text.trim()) built.push(toRecordStyle(anonymized.text));
    setGenerationVersion(nextVersion);
    setRefreshCounts({});
    setSnippets(built);
    setParagraph(built.join(" "));

    if (!isCloudAiEnabled || !auth?.currentUser) {
      toast(
        anonymized.redactions.length
          ? `개인정보 ${anonymized.redactions.length}건을 가리고 기기 초안을 만들었습니다.`
          : "관찰 근거 기반 기기 초안을 만들었습니다. 외부 AI 전송은 없습니다.",
      );
      return;
    }
    toast("행발 문장을 AI로 생성하고 추론된 사실이 없는지 검증하고 있습니다.");
    try {
      const ai = await generateBehaviorWithAi({
        anonymousStudentId: currentStudent?.id ?? `quick-behavior-${crypto.randomUUID()}`,
        entries: selected.map((keyword) => ({
          category: categoryForKeyword(keyword),
          keyword,
          degree: degrees[keyword] ?? "잘함",
        })),
        anonymizedTeacherNotes: anonymized.text,
        sentenceLength: "기본",
        style,
        usedAnonymousSentences: [
          ...Object.values(studentDrafts).map((draft) => draft.paragraph),
          paragraph,
        ].filter(Boolean),
        diversificationSeed: nextVersion,
      });
      const awkward =
        !ai.snippets.length ||
        ai.snippets.some(hasAwkwardBehaviorMeta) ||
        hasAwkwardBehaviorMeta(ai.finalParagraph);
      if (awkward) {
        toast("AI 문장에서 어색한 조사나 메타 표현을 감지해 자연스러운 기기 초안을 유지했습니다.");
      } else {
        setSnippets(ai.snippets);
        setParagraph(ai.finalParagraph);
        toast(
          ai.inferredClaims.length
            ? "입력하지 않은 추론 가능성이 있어 검토 필요로 표시했습니다."
            : "행발 AI 생성과 근거 검증을 마쳤습니다.",
        );
      }
    } catch {
      toast("AI 호출이 지연되거나 한도를 초과했습니다. 기기 초안은 그대로 유지됩니다.");
    }
  };

  const regenerateSnippet = (index: number) => {
    const next = [...snippets];
    if (index < selected.length) {
      let count = (refreshCounts[index] ?? 0) + 1;
      let candidate = composeSnippet(selected[index], generationVersion + index + count);
      while (candidate === snippets[index] && count < 6) {
        count += 1;
        candidate = composeSnippet(selected[index], generationVersion + index + count);
      }
      next[index] = candidate;
      setRefreshCounts((items) => ({ ...items, [index]: count }));
    } else if (anonymized.text.trim()) {
      const note = toRecordStyle(anonymized.text);
      const alternate = note.replace(/함\.$/u, "하는 모습을 보임.");
      next[index] = snippets[index] === note && alternate !== note ? alternate : note;
    }
    setSnippets(next);
    setParagraph(next.join(" "));
    toast("해당 문장을 같은 관찰 범위에서 다시 구성했습니다.");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(paragraph);
    toast("행발 문단을 복사했습니다.");
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeading
        eyebrow="행동특성 및 종합의견"
        title={classMode ? "우리 반 행발 작성" : "행발 빠른 생성"}
        description={
          classMode
            ? "학생별 관찰 키워드와 메모를 차례로 기록하세요."
            : "학생 정보 없이 관찰 키워드로 행발 문장 초안을 만듭니다."
        }
        icon={MessageCircleHeart}
      />

      {classMode && (
        <GlassPanel className="mb-4">
          <RosterInput
            students={students}
            setStudents={(next) => {
              setStudents(next);
              setStudentIndex(0);
              setStudentDrafts({});
            }}
            toast={toast}
          />
          {students.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-6 rounded-2xl bg-primary-soft p-3">
              <IconButton
                disabled={studentIndex === 0}
                onClick={() => goToStudent(studentIndex - 1)}
                aria-label="이전 학생"
              >
                <ChevronLeft />
              </IconButton>
              <div className="flex flex-col items-center">
                <small className="text-muted">
                  {studentIndex + 1} / {students.length}
                </small>
                <b>
                  {currentStudent?.number}.{" "}
                  {privacy ? maskName(currentStudent?.name ?? "") : currentStudent?.name}
                </b>
              </div>
              <IconButton
                disabled={studentIndex === students.length - 1}
                onClick={() => goToStudent(studentIndex + 1)}
                aria-label="다음 학생"
              >
                <ChevronRight />
              </IconButton>
            </div>
          )}
        </GlassPanel>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[.82fr_1.18fr]">
        <KeywordPicker
          selected={selected}
          onToggle={(keyword) =>
            setSelected(
              selected.includes(keyword)
                ? selected.filter((item) => item !== keyword)
                : [...selected, keyword],
            )
          }
        />

        <div className="flex flex-col gap-4">
          <GlassPanel>
            <h2 className="text-lg font-bold">평가단계와 메모</h2>
            {selected.length ? (
              <div className="mt-4 grid gap-2">
                {selected.map((keyword) => (
                  <label
                    key={keyword}
                    className="grid grid-cols-[1fr_minmax(160px,.7fr)] items-center gap-2.5 border-b border-line pb-2"
                  >
                    <b className="text-xs">{keyword}</b>
                    <select
                      value={degrees[keyword] ?? "잘함"}
                      onChange={(event) =>
                        setDegrees({ ...degrees, [keyword]: event.target.value })
                      }
                    >
                      {behaviorDegree.map((degree) => (
                        <option key={degree}>{degree}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[80px] place-items-center text-xs text-muted">
                왼쪽에서 키워드를 선택하세요.
              </div>
            )}

            <label className="mt-4 block text-xs font-extrabold">
              교사가 직접 관찰한 내용
              <textarea
                className="mt-2 min-h-[125px] w-full font-normal"
                placeholder="예: 모둠 활동에서 친구의 의견을 끝까지 듣고 역할을 나누어 과제를 완성함."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            {anonymized.redactions.length > 0 && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-success/10 p-3 text-success">
                <ShieldCheck size={17} />
                <div>
                  <b>기기 내 개인정보 {anonymized.redactions.length}건 가림</b>
                  <p className="mt-1 text-[11px]">{anonymized.text}</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold">문체</span>
                <select value={style} onChange={(event) => setStyle(event.target.value)}>
                  {styleOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <Button
                variant="primary"
                size="lg"
                disabled={!selected.length && !notes.trim()}
                onClick={() => void generate()}
              >
                <Sparkles size={18} /> 행발 문장 생성
              </Button>
            </div>
          </GlassPanel>

          {snippets.length > 0 && (
            <GlassPanel>
              <div className="flex justify-between gap-2.5">
                <div>
                  <h2 className="text-lg font-bold">행발 초안</h2>
                  <p className="mt-1 text-xs text-muted">
                    입력한 사실 밖의 내용이 없는지 확인하세요.
                  </p>
                </div>
                <span className="h-fit rounded-full bg-warning/15 px-2 py-1 text-[10px] font-extrabold text-warning">
                  교사 검토 필요
                </span>
              </div>
              <div className="my-4 grid gap-2">
                {snippets.map((snippet, index) => (
                  <div key={index} className="grid grid-cols-[28px_1fr_44px] items-start gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-[11px] font-extrabold text-primary-dark">
                      {index + 1}
                    </span>
                    <textarea
                      className="min-h-[74px]"
                      value={snippet}
                      onChange={(event) => {
                        const next = [...snippets];
                        next[index] = event.target.value;
                        setSnippets(next);
                        setParagraph(next.join(" "));
                      }}
                    />
                    <IconButton
                      aria-label={`${index + 1}번 문장 다시 생성`}
                      title="다른 문장으로 다시 생성"
                      onClick={() => regenerateSnippet(index)}
                    >
                      <RefreshCw size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
              <label className="block text-xs font-extrabold">
                완성 문단
                <textarea
                  className="mt-2 min-h-[150px] w-full font-normal leading-relaxed"
                  value={paragraph}
                  onChange={(event) => setParagraph(event.target.value)}
                />
              </label>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                <span>
                  {paragraph.length}자 · {utf8Bytes(paragraph)}바이트
                </span>
                <span className="text-success">● 개인정보 가림 확인</span>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setParagraph(snippets.join(" "))}>
                  <RefreshCw size={16} /> 다시 합치기
                </Button>
                <Button variant="primary" onClick={copy}>
                  <Clipboard size={16} /> 복사하기
                </Button>
              </div>
            </GlassPanel>
          )}
        </div>
      </section>
    </div>
  );
}
