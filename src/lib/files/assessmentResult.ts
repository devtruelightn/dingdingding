import type { CurriculumStandard, SchoolLevel } from "@/types";
import { extractPdfText } from "./pdf";
import { textMatchScore } from "./matching";
import { decodeBytes, MAX_FILE, type AssessmentResultRow } from "./types";

/** 평가단계 이름. "매우 잘함"이 "잘함"보다 먼저 와야 길게 잡힌다. */
const LEVEL =
  /매우\s*잘함|매우\s*노력\s*요함|노력\s*요함|잘함|보통/u;

/** 한 줄의 시작: 번호 + 넉넉한 공백 + 성명 */
const ROW_START = /(\d{1,3})\s{2,}([가-힣]{2,5})(?=\s)/gu;

const LEVEL_ALIAS: Record<string, SchoolLevel> = {
  "매우잘함": "매우 잘함",
  "잘함": "잘함",
  "보통": "보통",
  "노력요함": "노력요함",
  "매우노력요함": "매우 노력요함",
};

/** 쪽마다 반복되는 머리말·꼬리말과 표 머리행을 걷어낸다. */
const stripChrome = (text: string) =>
  text
    // "학교명/2026.08.28 23:33/10.3.***.225/작성자  2026.08.28." 형태의 머리말
    .replace(/\S+\/\d{4}\.\d{2}\.\d{2}[^\n]*?\d{4}\.\d{2}\.\d{2}\./gu, " ")
    .replace(/반\s*\/\s*번호\s+성명\s+영역\s+성취기준\s+평가요소\s+단계\s+평가결과/gu, " ")
    // "1   6 /" 처럼 쪽 번호만 남은 조각
    .replace(/\b\d+\s+\d+\s*\/\s*/gu, " ");

/**
 * 표를 평문으로 편 텍스트에서 학생별 본문을 복원한다.
 *
 * 한 학생 줄은 쪽이 넘어가면 여러 조각으로 쪼개지고, 쪼개진 자리는
 * 머리행 뒤에 번호·성명이 다시 찍힌다. 조각을 번호로 다시 모아 한 본문으로 잇는다.
 */
export const parseAssessmentResultText = (
  text: string,
): { number: number; name: string; body: string }[] => {
  const cleaned = stripChrome(text);
  const marks = [...cleaned.matchAll(ROW_START)];
  const rows: { number: number; name: string; body: string }[] = [];
  marks.forEach((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = marks[index + 1]?.index ?? cleaned.length;
    const body = cleaned.slice(start, end).replace(/\s+/gu, " ").trim();
    const number = Number(match[1]);
    const previous = rows.find((row) => row.number === number);
    if (previous) previous.body += ` ${body}`;
    else rows.push({ number, name: match[2], body });
  });
  return rows;
};

/**
 * 한 학생의 본문을 평가 블록으로 나눈다.
 *
 * 블록은 `영역 · 성취기준 · 평가요소 · 단계 · 평가결과` 순서라, 평가단계가
 * 블록의 끝을 알려 준다. 단계 앞쪽 토막에 영역과 성취기준이 들어 있다.
 */
export const splitEvaluationBlocks = (body: string) => {
  const levels = [...body.matchAll(new RegExp(LEVEL.source, "gu"))];
  let cursor = 0;
  return levels.map((match) => {
    const segment = body.slice(cursor, match.index ?? 0).trim();
    cursor = (match.index ?? 0) + match[0].length;
    return { segment, level: match[0].replace(/\s+/gu, "") };
  });
};

/** 토막에서 성취기준 원문으로 보이는 부분만 추려 화면에 보여 준다. */
const standardTextOf = (segment: string) => {
  // 앞 블록의 평가결과 꼬리가 붙어 있을 수 있어 마지막 `~다.` 문장을 쓴다.
  const sentences = segment.split(/(?<=다\s*\.)\s*/u).filter(Boolean);
  const head = sentences.length > 1 ? sentences[sentences.length - 2] : sentences[0] ?? segment;
  return head.replace(/^\S{1,4}\s+(?=\S)/u, "").trim().slice(0, 300);
};

/** 업로드 문구에 가장 가까운 공식 성취기준을 고른다. */
const resolveStandard = (body: string, standards: CurriculumStandard[]) => {
  let best: { standard: CurriculumStandard; score: number } | undefined;
  for (const standard of standards) {
    const score = textMatchScore(body, standard.standardText);
    if (!best || score > best.score) best = { standard, score };
  }
  return best && best.score >= 0.72 ? best.standard : undefined;
};

/**
 * 학교 업무 시스템의 "교과평가(성취기준별)" 결과 파일을 읽어
 * 학생별 평가단계를 공식 성취기준에 연결한다.
 */
export const analyzeAssessmentResults = async (
  file: File,
  standards: CurriculumStandard[],
): Promise<AssessmentResultRow[]> => {
  if (file.size > MAX_FILE) throw new Error("파일은 20MB 이하만 분석할 수 있습니다.");
  if (!/\.pdf$/i.test(file.name)) {
    throw new Error("평가결과는 PDF 파일만 분석할 수 있습니다.");
  }
  const buffer = await file.arrayBuffer();
  if (!decodeBytes(new Uint8Array(buffer.slice(0, 8))).startsWith("%PDF-")) {
    throw new Error("확장자와 내용이 일치하는 PDF만 사용할 수 있습니다.");
  }

  const rows = parseAssessmentResultText(await extractPdfText(buffer));
  if (!rows.length) {
    throw new Error(
      "학생별 평가 줄을 찾지 못했습니다. 성취기준별 교과평가 결과를 PDF로 내려받아 올려 주세요.",
    );
  }

  // 한 학생이 영역별로 여러 번 평가받으므로 블록마다 한 줄씩 만든다.
  return rows.slice(0, 200).flatMap((row) =>
    splitEvaluationBlocks(row.body).map((block) => ({
      number: row.number,
      name: row.name,
      schoolLevel: LEVEL_ALIAS[block.level] ?? "보통",
      uploadedStandardText: standardTextOf(block.segment),
      standard: resolveStandard(block.segment, standards),
    })),
  );
};
