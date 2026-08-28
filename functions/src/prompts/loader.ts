import { promptModules, type PromptPath } from "./generated/index.js";

const cache = new Map<PromptPath, string>();

/** 생성된 프롬프트 모듈에서 마크다운 본문을 읽는다. 인스턴스 수명 동안 캐시한다. */
export const readPrompt = async (promptPath: PromptPath): Promise<string> => {
  const cached = cache.get(promptPath);
  if (cached !== undefined) return cached;
  const module = await promptModules[promptPath]();
  cache.set(promptPath, module.default);
  return module.default;
};

/** 해당 경로의 프롬프트 파일이 존재하는지 확인한다. */
export const hasPrompt = (promptPath: string): promptPath is PromptPath => promptPath in promptModules;

/** 접두사로 시작하는 프롬프트 경로를 사전순으로 찾는다. 예시집 파일명 변형(_by-level 등)을 흡수한다. */
export const findPromptsByPrefix = (prefix: string): PromptPath[] =>
  (Object.keys(promptModules) as PromptPath[]).filter((promptPath) => promptPath.startsWith(prefix)).sort();

const levelHeadings = { A: "### 상", B: "### 중", C: "### 하" } as const;

/** 마크다운의 `## `/`### ` 표제 직전까지를 잘라 내지 않고 줄 단위로 상한을 지킨다. */
const takeLines = (lines: string[], maxChars: number) => {
  const picked: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length + 1 > maxChars) break;
    picked.push(line);
    length += line.length + 1;
  }
  return picked;
};

/**
 * 예시집에서 성취수준에 해당하는 절만 발췌한다.
 *
 * 예시집 전체 합계가 700KB를 넘고 최대 파일이 84KB인데 호출당 max_tokens 가 1400 이므로 통째로 주입할 수 없다.
 * `### 상`/`### 중`/`### 하` 절이 있으면 문서 머리말과 해당 절만 남기고, 없으면 앞부분을 상한까지 자른다.
 * 예시집 파일들이 스스로 "성취도별 2~3개만 선별해서 넣을 것"이라고 지시한 방식을 그대로 구현한 것이다.
 */
export const excerptExample = (content: string, officialLevel: "A" | "B" | "C", maxChars = 2600): string => {
  const lines = content.split("\n");
  const heading = levelHeadings[officialLevel];
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) return takeLines(lines, maxChars).join("\n").trimEnd();

  // 머리말(첫 `### ` 표제 이전)은 "그대로 복사하지 말 것" 같은 사용 지침을 담고 있으므로 항상 유지한다.
  const firstSection = lines.findIndex((line) => line.startsWith("### "));
  const preamble = lines.slice(0, firstSection);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("### "));
  const section = lines.slice(start, end === -1 ? lines.length : end);

  const preambleChars = preamble.reduce((sum, line) => sum + line.length + 1, 0);
  const body = takeLines(section, Math.max(maxChars - preambleChars, 600));
  return [...preamble, ...body].join("\n").trimEnd();
};
