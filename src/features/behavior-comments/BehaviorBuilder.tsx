"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clipboard, Download, List, MessageCircleHeart, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button, GlassPanel, IconButton, Modal, PageHeading } from "@/components/ui";
import { auth, generateBehaviorWithAi, isCloudAiEnabled } from "@/lib/firebase";
import { anonymizeText } from "@/lib/privacy";
import { loadBehaviorWork, saveBehaviorWork } from "@/lib/storage";
import { createBehaviorSentence, hasAwkwardBehaviorMeta, toRecordStyle, utf8Bytes } from "@/lib/text";
import type { BehaviorStudentWork, BehaviorWorkState, TeacherProfile } from "@/types";
import { downloadBehaviorWorkbook } from "./behaviorExport";
import { behaviorMissingCount, createBehaviorStudent, createBehaviorWorkState, migrateBehaviorWork, requiresBehaviorResizeConfirmation, resizeBehaviorWork, updateBehaviorStudent } from "./behaviorWork";
import { KeywordPicker } from "./components/KeywordPicker";
import { behaviorDegree, categoryForKeyword } from "./keywords";

interface Props { classMode?: boolean; profile: TeacherProfile; privacy: boolean; toast: (message: string) => void }
type SaveStatus = "saving" | "saved" | "error";
const styleOptions = ["담백하게", "따뜻하게", "자세하게"] as const;

/** 관찰 근거로 행발을 만들며, 학급 모드에서는 번호별 작업을 자동 저장한다. */
export function BehaviorBuilder({ classMode = false, profile, toast }: Props) {
  const [work, setWork] = useState<BehaviorWorkState>(() => createBehaviorWorkState());
  const [quickWork, setQuickWork] = useState(() => createBehaviorStudent(1));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [hydrated, setHydrated] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [downloadWarning, setDownloadWarning] = useState(false);
  const [generationVersion, setGenerationVersion] = useState(0);
  const [refreshCounts, setRefreshCounts] = useState<Record<number, number>>({});
  const workRef = useRef(work);
  workRef.current = work;

  useEffect(() => { if (classMode) setWork(migrateBehaviorWork(loadBehaviorWork())); setHydrated(true); }, [classMode]);
  useEffect(() => {
    if (!classMode || !hydrated) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => setSaveStatus(saveBehaviorWork(work) ? "saved" : "error"), 400);
    return () => window.clearTimeout(timer);
  }, [classMode, hydrated, work]);

  const persistNow = (next = workRef.current) => { if (classMode) setSaveStatus(saveBehaviorWork(next) ? "saved" : "error"); };
  const active = classMode ? work.students[work.currentStudentNumber - 1] ?? createBehaviorStudent(work.currentStudentNumber) : quickWork;
  const anonymized = anonymizeText(active.observationMemo, []);

  const updateActive = (changes: Partial<BehaviorStudentWork>) => {
    if (classMode) setWork((current) => updateBehaviorStudent(current, current.currentStudentNumber, changes));
    else setQuickWork((current) => ({ ...current, ...changes, status: (changes.finalText ?? current.finalText).trim() ? "completed" : "draft", updatedAt: new Date().toISOString() }));
  };
  const selectStudent = (studentNumber: number) => { persistNow(); setWork((current) => ({ ...current, currentStudentNumber: studentNumber })); setRefreshCounts({}); };
  const requestCountChange = (count: number) => requiresBehaviorResizeConfirmation(work, count) ? setPendingCount(count) : setWork((current) => resizeBehaviorWork(current, count));
  const confirmCountChange = () => { if (pendingCount === null) return; const next = resizeBehaviorWork(workRef.current, pendingCount); setWork(next); persistNow(next); setPendingCount(null); };

  const generate = async () => {
    const targetNumber = active.studentNumber;
    const target = active;
    const version = generationVersion + 1;
    const safeNotes = anonymizeText(target.observationMemo, []);
    const built = target.selectedKeywords.map((keyword, index) => createBehaviorSentence(keyword, target.keywordLevels[keyword] ?? "잘함", version + index));
    if (safeNotes.text.trim()) built.push(toRecordStyle(safeNotes.text));
    const localText = built.join(" ");
    setGenerationVersion(version); setRefreshCounts({});
    const applyResult = (snippets: string[], text: string) => classMode
      ? setWork((current) => updateBehaviorStudent(current, targetNumber, { snippets, generatedText: text, finalText: text }))
      : updateActive({ snippets, generatedText: text, finalText: text });
    applyResult(built, localText);
    if (!isCloudAiEnabled || !auth?.currentUser) { toast(safeNotes.redactions.length ? `개인정보 ${safeNotes.redactions.length}건을 가리고 기기 초안을 만들었습니다.` : "관찰 근거 기반 기기 초안을 만들었습니다. 외부 AI 전송은 없습니다."); return; }
    toast("행발 문장을 AI로 생성하고 추론된 사실이 없는지 검증하고 있습니다.");
    try {
      const ai = await generateBehaviorWithAi({
        // 학교급마다 행발 지침이 달라 서버가 프롬프트 팩을 고를 수 있게 함께 보낸다.
        stage: profile.schoolLevel,
        anonymousStudentId: classMode ? `class-behavior-${targetNumber}` : `quick-behavior-${crypto.randomUUID()}`,
        entries: target.selectedKeywords.map((keyword) => ({ category: categoryForKeyword(keyword), keyword, degree: target.keywordLevels[keyword] ?? "잘함" })),
        anonymizedTeacherNotes: safeNotes.text, sentenceLength: "기본", style: target.style,
        usedAnonymousSentences: classMode ? workRef.current.students.map((student) => student.finalText).filter(Boolean) : [target.finalText].filter(Boolean), diversificationSeed: version,
      });
      const awkward = !ai.snippets.length || ai.snippets.some(hasAwkwardBehaviorMeta) || hasAwkwardBehaviorMeta(ai.finalParagraph);
      if (awkward) toast("AI 문장에서 어색한 조사나 메타 표현을 감지해 자연스러운 기기 초안을 유지했습니다.");
      else { applyResult(ai.snippets, ai.finalParagraph); toast(ai.inferredClaims.length ? "입력하지 않은 추론 가능성이 있어 검토 필요로 표시했습니다." : "행발 AI 생성과 근거 검증을 마쳤습니다."); }
    } catch { toast("AI 호출이 지연되거나 한도를 초과했습니다. 기존 초안은 그대로 유지됩니다."); }
  };

  const regenerateSnippet = (index: number) => {
    const snippets = [...active.snippets];
    if (index < active.selectedKeywords.length) {
      let count = (refreshCounts[index] ?? 0) + 1;
      let candidate = createBehaviorSentence(active.selectedKeywords[index], active.keywordLevels[active.selectedKeywords[index]] ?? "잘함", generationVersion + index + count);
      while (candidate === snippets[index] && count < 6) { count += 1; candidate = createBehaviorSentence(active.selectedKeywords[index], active.keywordLevels[active.selectedKeywords[index]] ?? "잘함", generationVersion + index + count); }
      snippets[index] = candidate; setRefreshCounts((items) => ({ ...items, [index]: count }));
    } else if (anonymized.text.trim()) { const note = toRecordStyle(anonymized.text); snippets[index] = snippets[index] === note ? note.replace(/함\.$/u, "하는 모습을 보임.") : note; }
    updateActive({ snippets, generatedText: snippets.join(" "), finalText: snippets.join(" ") }); toast("해당 문장을 같은 관찰 범위에서 다시 구성했습니다.");
  };

  const completedCount = useMemo(() => work.students.filter((student) => student.finalText.trim()).length, [work.students]);
  const missingCount = behaviorMissingCount(work);
  const download = async () => { persistNow(); if (missingCount) setDownloadWarning(true); else await downloadBehaviorWorkbook(workRef.current); };

  if (classMode && resultsOpen) return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><PageHeading eyebrow="행동특성 및 종합의견" title="전체 학생 행발" description="학생별로 작성한 행동특성 및 종합의견을 한 번에 확인할 수 있습니다." icon={List} /><div className="flex shrink-0 flex-wrap gap-2"><Button onClick={() => { setResultsOpen(false); persistNow(); }}><ChevronLeft size={17} /> 돌아가기</Button><Button variant="primary" onClick={() => void download()}><Download size={17} /> 엑셀로 내려받기</Button></div></div>
      <div className="mb-4 grid grid-cols-3 gap-2">{[["전체 인원", work.studentCount], ["작성 완료", completedCount], ["미작성", missingCount]].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-card p-3 text-center"><div className="text-xs text-muted">{label}</div><b className="mt-1 block text-xl">{value}명</b></div>)}</div>
      <div className="grid gap-3">{work.students.map((student) => <GlassPanel key={student.studentNumber} className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b>{student.studentNumber}번 학생</b><StatusBadge status={student.status} /></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{student.finalText || "아직 생성된 행발 내용이 없습니다."}</p></div><Button size="sm" onClick={() => { selectStudent(student.studentNumber); setResultsOpen(false); }}>수정하기</Button></div></GlassPanel>)}</div>
      {downloadWarning && <DownloadWarning total={work.studentCount} missing={missingCount} onCancel={() => setDownloadWarning(false)} onConfirm={() => { setDownloadWarning(false); void downloadBehaviorWorkbook(workRef.current); }} />}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="flex items-start justify-between gap-3"><PageHeading eyebrow="행동특성 및 종합의견" title={classMode ? "우리 반 행발 작성" : "행발 빠른 생성"} description={classMode ? "학생별 관찰 키워드와 메모를 차례로 기록하세요." : "학생 정보 없이 관찰 키워드로 행발 문장 초안을 만듭니다."} icon={MessageCircleHeart} />{classMode && <span aria-live="polite" className={`mt-2 shrink-0 text-[11px] ${saveStatus === "error" ? "text-danger" : "text-muted"}`}>{saveStatus === "saving" ? "저장 중…" : saveStatus === "saved" ? "자동 저장됨" : "저장하지 못했습니다. 다시 시도해 주세요."}</span>}</div>
      {classMode && (
        <div className="mb-5 grid gap-3">
          <GlassPanel className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold">행발 작성 인원</h2>
                <p className="mt-1 text-xs text-muted">행동특성 및 종합의견을 작성할 학생 수를 선택하세요.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold">
                인원수
                <select aria-label="행발 작성 인원" value={work.studentCount} onChange={(event) => requestCountChange(Number(event.target.value))}>
                  {Array.from({ length: 50 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}명</option>)}
                </select>
              </label>
            </div>
          </GlassPanel>

          <GlassPanel className="overflow-hidden p-0">
            <div className="grid items-center gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto_1fr]">
              <div className="hidden lg:block" aria-hidden="true" />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button disabled={work.currentStudentNumber === 1} onClick={() => selectStudent(work.currentStudentNumber - 1)}>
                  <ChevronLeft size={17} /> 이전 학생
                </Button>
                <select className="min-w-[190px]" aria-label="현재 학생 번호" value={work.currentStudentNumber} onChange={(event) => selectStudent(Number(event.target.value))}>
                  {work.students.map((student) => <option key={student.studentNumber} value={student.studentNumber}>{student.studentNumber}번 학생 · {student.status === "completed" ? "작성 완료" : student.status === "draft" ? "작성 중" : "미작성"}</option>)}
                </select>
                <Button disabled={work.currentStudentNumber === work.studentCount} onClick={() => selectStudent(work.currentStudentNumber + 1)}>
                  다음 학생 <ChevronRight size={17} />
                </Button>
              </div>
              <Button className="justify-self-center lg:justify-self-end" variant="soft" onClick={() => { persistNow(); setResultsOpen(true); }}>
                <List size={17} /> 전체 학생 결과
              </Button>
            </div>
            <div className="flex min-h-[58px] items-center justify-center gap-2 border-t border-primary/15 bg-primary-soft px-4 py-3 text-center">
              <b className="text-sm text-ink">{work.currentStudentNumber}번 학생</b>
              <StatusBadge status={active.status} />
            </div>
          </GlassPanel>
        </div>
      )}
      <section className="grid items-start gap-4 lg:grid-cols-[.82fr_1.18fr]"><KeywordPicker selected={active.selectedKeywords} onToggle={(keyword) => updateActive({ selectedKeywords: active.selectedKeywords.includes(keyword) ? active.selectedKeywords.filter((item) => item !== keyword) : [...active.selectedKeywords, keyword] })} /><div className="flex flex-col gap-4"><GlassPanel><h2 className="text-lg font-bold">관찰 수준 및 기록</h2><p className="mt-1 text-xs text-muted">키워드별 관찰 수준을 선택하고, 교사가 직접 관찰한 내용을 기록하세요.</p>{active.selectedKeywords.length ? <div className="mt-4 grid gap-2">{active.selectedKeywords.map((keyword) => <label key={keyword} className="grid grid-cols-[1fr_minmax(140px,.7fr)] items-center gap-2.5 border-b border-line pb-2"><b className="text-xs">{keyword}</b><select value={active.keywordLevels[keyword] ?? "잘함"} onChange={(event) => updateActive({ keywordLevels: { ...active.keywordLevels, [keyword]: event.target.value as BehaviorStudentWork["keywordLevels"][string] } })}>{behaviorDegree.map((degree) => <option key={degree}>{degree}</option>)}</select></label>)}</div> : <div className="grid min-h-[80px] place-items-center text-xs text-muted">왼쪽에서 키워드를 선택하세요.</div>}<label className="mt-4 block text-xs font-extrabold">교사가 직접 관찰한 내용<textarea className="mt-2 min-h-[125px] w-full font-normal" placeholder="예: 모둠 활동에서 친구의 의견을 끝까지 듣고 역할을 나누어 과제를 완성함." value={active.observationMemo} onChange={(event) => updateActive({ observationMemo: event.target.value })} /></label>{anonymized.redactions.length > 0 && <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-success/10 p-3 text-success"><ShieldCheck size={17} className="shrink-0" /><div><b>기기 내 개인정보 {anonymized.redactions.length}건 가림</b><p className="mt-1 text-[11px]">{anonymized.text}</p></div></div>}<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="flex flex-col gap-1.5"><span className="text-xs font-extrabold">문체</span><select value={active.style} onChange={(event) => updateActive({ style: event.target.value })}>{styleOptions.map((option) => <option key={option}>{option}</option>)}</select></label><Button variant="primary" size="lg" disabled={!active.selectedKeywords.length && !active.observationMemo.trim()} onClick={() => void generate()}><Sparkles size={18} /> 행발 문장 생성</Button></div></GlassPanel>
      {active.snippets.length > 0 && <GlassPanel><div className="flex justify-between gap-2.5"><div><h2 className="text-lg font-bold">행발 초안</h2><p className="mt-1 text-xs text-muted">입력한 사실 밖의 내용이 없는지 확인하세요.</p></div><span className="h-fit rounded-full bg-warning/15 px-2 py-1 text-[10px] font-extrabold text-warning">교사 검토 필요</span></div><div className="my-4 grid gap-2">{active.snippets.map((snippet, index) => <div key={index} className="grid grid-cols-[28px_minmax(0,1fr)_44px] items-start gap-2"><span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-[11px] font-extrabold text-primary-dark">{index + 1}</span><textarea className="min-h-[74px]" value={snippet} onChange={(event) => { const snippets = [...active.snippets]; snippets[index] = event.target.value; updateActive({ snippets, finalText: snippets.join(" ") }); }} /><IconButton aria-label={`${index + 1}번 문장 다시 생성`} title="다른 문장으로 다시 생성" onClick={() => regenerateSnippet(index)}><RefreshCw size={16} /></IconButton></div>)}</div><label className="block text-xs font-extrabold">완성 문단<textarea className="mt-2 min-h-[150px] w-full font-normal leading-relaxed" value={active.finalText} onChange={(event) => updateActive({ finalText: event.target.value })} /></label><div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"><span>{active.finalText.length}자 · {utf8Bytes(active.finalText)}바이트</span><span className="text-success">● 개인정보 가림 확인</span></div><div className="mt-4 flex flex-wrap justify-end gap-2"><Button onClick={() => updateActive({ finalText: active.snippets.join(" ") })}><RefreshCw size={16} /> 다시 합치기</Button><Button variant="primary" onClick={async () => { await navigator.clipboard.writeText(active.finalText); toast("행발 문단을 복사했습니다."); }}><Clipboard size={16} /> 복사하기</Button></div></GlassPanel>}</div></section>
      {pendingCount !== null && <Modal labelledBy="behavior-count-title"><GlassPanel className="w-full max-w-md"><h2 id="behavior-count-title" className="text-lg font-bold">인원수를 변경할까요?</h2><p className="mt-2 text-sm text-muted">인원수를 줄이면 선택 범위를 벗어난 학생의 작업 내용이 삭제됩니다. 계속할까요?</p><div className="mt-5 flex justify-end gap-2"><Button onClick={() => setPendingCount(null)}>취소</Button><Button variant="danger" onClick={confirmCountChange}>인원수 변경</Button></div></GlassPanel></Modal>}
    </div>
  );
}

function StatusBadge({ status }: { status: BehaviorStudentWork["status"] }) { const label = status === "completed" ? "작성 완료" : status === "draft" ? "작성 중" : "미작성"; const color = status === "completed" ? "bg-success/15 text-success" : status === "draft" ? "bg-warning/15 text-warning" : "bg-solid text-muted"; return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${color}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>; }
function DownloadWarning({ total, missing, onCancel, onConfirm }: { total: number; missing: number; onCancel: () => void; onConfirm: () => void }) { return <Modal labelledBy="download-warning-title"><GlassPanel className="w-full max-w-md"><h2 id="download-warning-title" className="text-lg font-bold">미작성 학생이 있습니다</h2><p className="mt-2 text-sm text-muted">전체 {total}명 중 {missing}명의 행발이 아직 작성되지 않았습니다. 빈칸을 포함하여 내려받을까요?</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={onCancel}>계속 작성하기</Button><Button variant="primary" onClick={onConfirm}><Download size={17} /> 빈칸 포함 내려받기</Button></div></GlassPanel></Modal>; }
