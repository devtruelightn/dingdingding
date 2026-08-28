import { cleanFormula, type ExtractedPlanRow } from "./types";

/** 표 형태 그리드에서 성취기준 관련 열을 찾아 행으로 변환한다. */
export const rowsFromGrid = (grid: string[][]): ExtractedPlanRow[] => {
  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => /성취기준|평가영역|평가 요소|평가요소|과목/.test(cell)),
  );
  if (headerIndex < 0) return [];
  const headers = grid[headerIndex];
  const indexFor = (pattern: RegExp) => headers.findIndex((cell) => pattern.test(cell));
  const indices = {
    subject: indexFor(/과목|교과/),
    area: indexFor(/평가\s*영역|영역/),
    code: indexFor(/성취기준\s*코드|성취기준/),
    text: indexFor(/성취기준\s*원문|성취기준/),
    element: indexFor(/평가\s*요소/),
    timing: indexFor(/평가\s*시기|시기/),
  };
  return grid
    .slice(headerIndex + 1)
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      subject: indices.subject >= 0 ? row[indices.subject] ?? "" : "",
      area: indices.area >= 0 ? row[indices.area] ?? "" : "",
      standardCode:
        indices.code >= 0
          ? (row[indices.code] ?? "").match(/[246][가-힣]{1,2}\d{2}-\d{2}/u)?.[0] ?? ""
          : "",
      standardText: indices.text >= 0 ? row[indices.text] ?? "" : "",
      evaluationElement: indices.element >= 0 ? row[indices.element] ?? "" : "",
      timing: indices.timing >= 0 ? row[indices.timing] ?? "" : "",
    }));
};

/** PDF·HWPX에서 뽑은 평문에서 성취기준 코드와 뒤따르는 문구를 추출한다. */
export const parseExtractedText = (text: string): ExtractedPlanRow[] => {
  const codes = [...text.matchAll(/\[?([246][가-힣]{1,2}\d{2}-\d{2})\]?/gu)];
  return codes.map((match, index) => {
    const start = match.index ?? 0;
    const end = codes[index + 1]?.index ?? Math.min(text.length, start + 600);
    const segment = text.slice(start + match[0].length, end).replace(/\s+/g, " ").trim();
    return {
      subject: "",
      area: "",
      standardCode: match[1],
      standardText: segment.slice(0, 400),
      evaluationElement: "",
      timing: "",
    };
  });
};

/** RFC 4180 스타일 CSV 문자열을 그리드로 파싱한다. */
export const parseCsvGrid = (text: string): ExtractedPlanRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cleanFormula(cell));
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cleanFormula(cell));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cleanFormula(cell));
    rows.push(row);
  }
  return rowsFromGrid(rows);
};
