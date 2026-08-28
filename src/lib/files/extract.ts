import { cleanFormula, type ExtractedPlanRow } from "./types";

/**
 * 성취기준 코드 패턴. PDF·HWPX에서 뽑은 글자는 `[6 국 03-05]`처럼
 * 글리프 사이에 공백이 끼어 나오므로 토큰 사이 공백을 허용한다.
 * 학교가 자체 편성한 과목(`6국사상01-01`, `6과설계자-02-01`)까지 잡도록
 * 영역 이름은 5자까지, 앞자리 두 자리 수 앞의 하이픈은 선택으로 둔다.
 */
const STANDARD_CODE = /\[?\s*([246])\s*([가-힣]{1,5})\s*-?\s*(\d{2})\s*-\s*(\d{2})\s*\]?/u;
const STANDARD_CODE_GLOBAL = new RegExp(STANDARD_CODE.source, "gu");

/** 공백이 섞인 코드 조각을 `6국03-05` 형태로 합친다. */
const joinCode = (match: RegExpMatchArray) => `${match[1]}${match[2]}${match[3]}-${match[4]}`;

/** 셀 안에서 첫 성취기준 코드를 찾아 정규화한다. 없으면 빈 문자열. */
export const findStandardCode = (value: string) => {
  const match = STANDARD_CODE.exec(value);
  return match ? joinCode(match) : "";
};

/**
 * 코드 뒤 본문에서 성취기준 원문만 잘라낸다. 학교 평가계획은 한 칸에
 * 성취기준 + 단원 + 평가요소 + 평가기준을 이어 붙여 내보내므로,
 * 문장이 끝나는 첫 `~다.`까지를 원문으로 본다.
 */
const standardSentence = (segment: string) => {
  const end = /다\s*\./u.exec(segment);
  return end ? segment.slice(0, end.index + end[0].length).trim() : segment.slice(0, 400);
};

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
      standardCode: indices.code >= 0 ? findStandardCode(row[indices.code] ?? "") : "",
      standardText: indices.text >= 0 ? row[indices.text] ?? "" : "",
      evaluationElement: indices.element >= 0 ? row[indices.element] ?? "" : "",
      timing: indices.timing >= 0 ? row[indices.timing] ?? "" : "",
    }));
};

/** PDF·HWPX에서 뽑은 평문에서 성취기준 코드와 뒤따르는 문구를 추출한다. */
export const parseExtractedText = (text: string): ExtractedPlanRow[] => {
  const codes = [...text.matchAll(STANDARD_CODE_GLOBAL)];
  return codes.map((match, index) => {
    const start = match.index ?? 0;
    const end = codes[index + 1]?.index ?? Math.min(text.length, start + 600);
    const segment = text.slice(start + match[0].length, end).replace(/\s+/g, " ").trim();
    return {
      subject: "",
      area: "",
      standardCode: joinCode(match),
      standardText: standardSentence(segment),
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
