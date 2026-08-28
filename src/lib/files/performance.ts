import { readXlsxGrid } from "./spreadsheet";
import { decodeBytes, MAX_FILE, type PerformanceRow } from "./types";

/** 학생을 가리키는 열. 이름 열은 읽지 않고 번호만 쓴다. */
const NUMBER_HEADER = /번호|학번/u;
const NAME_HEADER = /이름|성명/u;
const CAREER_HEADER = /진로|전공|희망/u;
const TOPIC_HEADER = /주제|선택|과제/u;

/** "1반 1번", "3", "10번" 어느 형태로 적혀도 번호만 뽑는다. */
const studentNumber = (value: string) => {
  const withMarker = /(\d{1,3})\s*번/u.exec(value);
  if (withMarker) return Number(withMarker[1]);
  const numbers = value.match(/\d{1,3}/gu);
  return numbers ? Number(numbers[numbers.length - 1]) : 0;
};

/** "① 개념 및 원리" → "개념 및 원리" */
const aspectLabel = (header: string) =>
  header
    .replace(/^[\s\p{No}\p{Nd}().·▪-]+/u, "")
    .replace(/\s+/gu, " ")
    .trim();

/**
 * 수행평가 정리 워크북을 학생별 행으로 읽는다.
 *
 * 머리행에서 번호·진로·주제 열을 찾고, 남은 열은 모두 서술형 항목으로 본다.
 * 이름 열은 생기부에 넣지 않으므로 아예 읽지 않는다.
 */
export const parsePerformanceGrid = (grid: string[][]): PerformanceRow[] => {
  const headerIndex = grid.findIndex((row) => row.some((cell) => NUMBER_HEADER.test(cell)));
  if (headerIndex < 0) return [];
  const headers = grid[headerIndex];
  const find = (pattern: RegExp) => headers.findIndex((cell) => pattern.test(cell));
  const numberAt = find(NUMBER_HEADER);
  const careerAt = find(CAREER_HEADER);
  const topicAt = find(TOPIC_HEADER);
  const nameAt = find(NAME_HEADER);
  const reserved = new Set([numberAt, careerAt, topicAt, nameAt].filter((index) => index >= 0));
  const aspectColumns = headers
    .map((header, index) => ({ label: aspectLabel(header), index }))
    .filter((column) => column.label && !reserved.has(column.index));

  return grid
    .slice(headerIndex + 1)
    .map((row) => ({
      number: studentNumber(row[numberAt] ?? ""),
      career: (careerAt >= 0 ? row[careerAt] ?? "" : "").trim(),
      topic: (topicAt >= 0 ? row[topicAt] ?? "" : "").trim(),
      aspects: aspectColumns
        .map((column) => ({ label: column.label, text: (row[column.index] ?? "").trim() }))
        .filter((aspect) => aspect.text),
    }))
    .filter((row) => row.number > 0 && row.aspects.length > 0);
};

/** 수행평가 정리 파일(XLSX)을 읽어 학생별 서술을 뽑는다. */
export const analyzePerformanceFile = async (file: File): Promise<PerformanceRow[]> => {
  if (file.size > MAX_FILE) throw new Error("파일은 20MB 이하만 분석할 수 있습니다.");
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error("수행평가 자료는 XLSX 파일만 분석할 수 있습니다.");
  }
  const buffer = await file.arrayBuffer();
  if (!decodeBytes(new Uint8Array(buffer.slice(0, 8))).startsWith("PK")) {
    throw new Error("확장자와 내용이 일치하는 XLSX만 사용할 수 있습니다.");
  }
  const rows = parsePerformanceGrid(await readXlsxGrid(buffer));
  if (!rows.length) {
    throw new Error(
      "학생별 수행평가 줄을 찾지 못했습니다. 첫 줄에 번호와 항목 이름이 있는 표인지 확인해 주세요.",
    );
  }
  return rows;
};
