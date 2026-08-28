import type { CurriculumStandard } from "@/types";
import { parseCsvGrid } from "./extract";
import { parseHwpx } from "./hwpx";
import { parsePdf } from "./pdf";
import { parseXlsx } from "./spreadsheet";
import { suggestOfficialStandards, textMatchScore } from "./matching";
import {
  decodeBytes,
  MAX_FILE,
  type AssessmentPlanRow,
  type AssessmentPlanSuggestion,
  type ExtractedPlanRow,
  type MatchStatus,
} from "./types";

/** 학교 평가계획 파일(PDF·HWPX·XLSX·CSV)을 분석해 공식 성취기준과 대조한다. */
export const analyzeAssessmentPlan = async (
  file: File,
  standards: CurriculumStandard[],
): Promise<AssessmentPlanRow[]> => {
  if (file.size > MAX_FILE) throw new Error("파일은 20MB 이하만 분석할 수 있습니다.");
  if (/\.hwp$/i.test(file.name)) {
    throw new Error(
      "구형 HWP는 자동 분석할 수 없습니다. 한글에서 HWPX 또는 PDF로 저장한 뒤 다시 올려 주세요.",
    );
  }
  const buffer = await file.arrayBuffer();
  const signature = decodeBytes(new Uint8Array(buffer.slice(0, 8)));
  let extracted: ExtractedPlanRow[] = [];
  if (/\.pdf$/i.test(file.name) && signature.startsWith("%PDF-")) {
    extracted = await parsePdf(buffer);
  } else if (/\.xlsx$/i.test(file.name) && signature.startsWith("PK")) {
    extracted = await parseXlsx(buffer);
  } else if (/\.hwpx$/i.test(file.name) && signature.startsWith("PK")) {
    extracted = await parseHwpx(buffer);
  } else if (/\.csv$/i.test(file.name)) {
    extracted = parseCsvGrid(await file.text());
  } else {
    throw new Error("확장자와 파일 내용이 일치하는 PDF·HWPX·XLSX·CSV만 사용할 수 있습니다.");
  }

  return extracted.slice(0, 300).map((row) => {
    const official = standards.find((item) => item.standardCode === row.standardCode);
    const suppliedText = row.standardText.replace(row.standardCode, "").trim();
    const exact = Boolean(
      official && (!suppliedText || textMatchScore(suppliedText, official.standardText) >= 0.985),
    );
    const suggestions: AssessmentPlanSuggestion[] = official
      ? [
          {
            standardCode: official.standardCode,
            subject: official.subjectName,
            area: official.areaName,
            standardText: official.standardText,
            score: 1,
          },
        ]
      : suggestOfficialStandards(row, standards);
    const best = suggestions[0];
    const suggested = !official && best?.score >= 0.58 ? best : undefined;
    const status: MatchStatus = !row.standardCode
      ? "직접 입력 항목"
      : official
        ? exact
          ? "공식 PDF와 정확히 일치"
          : "원문 불일치"
        : suggested
          ? "유사 기준 발견"
          : "코드 불일치";
    const resolution =
      status === "공식 PDF와 정확히 일치"
        ? "코드와 원문이 공식 2022 개정 자료와 일치합니다."
        : status === "원문 불일치"
          ? "코드는 맞지만 학교 문구가 공식 원문과 다릅니다. 평어 근거는 공식 원문으로 적용하세요."
          : status === "유사 기준 발견"
            ? `입력 코드 ${row.standardCode}는 공식 자료에 없지만 내용상 ${suggested?.standardCode} 기준이 가장 가깝습니다. 추천 원문을 확인한 뒤 적용하세요.`
            : status === "코드 불일치"
              ? "입력 코드가 2022 개정 공식 자료에 없습니다. 추천 후보를 비교하거나 교육과정에서 직접 선택하세요."
              : "성취기준 코드를 찾지 못했습니다. 교육과정에서 직접 선택하세요.";
    const resolved =
      official ??
      (suggested ? standards.find((item) => item.standardCode === suggested.standardCode) : undefined);
    return {
      id: crypto.randomUUID(),
      ...row,
      subject: row.subject || resolved?.subjectName || "",
      area: row.area || resolved?.areaName || "",
      standardText: resolved?.standardText ?? row.standardText,
      uploadedStandardText: suppliedText,
      officialStandardCode: resolved?.standardCode ?? "",
      officialStandardText: resolved?.standardText ?? "",
      suggestions,
      resolution,
      status,
      // 교사가 클릭하지 않아도 일치·추천된 기준은 기본적으로 사용한다.
      confirmed: Boolean(resolved),
    };
  });
};
