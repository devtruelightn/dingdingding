import type { PromptPath } from "./generated/index.js";
import { behaviorSystemPrompt, subjectSystemPrompt } from "./legacy.js";
import { excerptExample, findPromptsByPrefix, hasPrompt, readPrompt } from "./loader.js";

export { BEHAVIOR_PROMPT_VERSION, SUBJECT_PROMPT_VERSION, verificationSystemPrompt } from "./legacy.js";

export type PromptStage = "elementary" | "middle" | "high";
export type PromptTask = "subject" | "behavior";
export type PromptPackId = "elementary" | "middle-pe" | "high-info" | "legacy";

export interface SelectPromptInput {
  stage: PromptStage;
  task: PromptTask;
  /** 교과(목) 이름. 행발 요청에는 없을 수 있다. */
  subject?: string;
  /** 평가 영역·단원. 예시집 선택에 쓴다. */
  area?: string;
  /** 초등 학년군. 초등 예시집 선택에 쓴다. */
  gradeBand?: "1-2" | "3-4" | "5-6";
  /** 초등 학년. 학년군만으로는 3학년·4학년 예시집을 구분할 수 없어 있으면 우선한다. */
  grade?: number;
  /** 공식 성취수준. 예시집에서 상·중·하 절을 고르는 데 쓴다. */
  officialLevel?: "A" | "B" | "C";
}

export interface SelectedPrompt {
  packId: PromptPackId;
  /** 조립이 끝난 system 프롬프트. */
  system: string;
  /** 주입된 예시집 경로. 없으면 null. 로깅·디버깅용. */
  examplePath: PromptPath | null;
}

interface PromptPack {
  /** `_shared/00_common.md` 주입 여부. elementary 코어 프롬프트는 공통 내용을 자체적으로 담고 있어 중복이다. */
  includeCommon: boolean;
  core: PromptPath;
}

const packs: Record<Exclude<PromptPackId, "legacy">, PromptPack> = {
  elementary: { includeCommon: false, core: "elementary/00_core_prompt.md" },
  "middle-pe": { includeCommon: true, core: "middle-pe/00_core_prompt.md" },
  "high-info": { includeCommon: true, core: "high-info/00_core_prompt.md" },
};

const middlePeSubjects = new Set(["체육", "음악", "미술"]);
const highInfoSubjects = new Set(["정보"]);

/**
 * 학교급·교과로 프롬프트 팩을 고른다.
 *
 * 행발(`behavior`)은 담임이 작성하므로 교과가 없다. 학교급만으로 팩을 고르는데, 이는 팩마다 다른
 * 글자 수 상한(중·고 900Byte, 초등 제한 없음)과 바이트 계산 기준(엔터 1Byte vs 2Byte)이
 * 행발에도 그대로 적용되기 때문이다.
 */
const packIdFor = ({ stage, task, subject }: SelectPromptInput): PromptPackId => {
  if (stage === "elementary") return "elementary";
  if (task === "behavior") return stage === "middle" ? "middle-pe" : "high-info";
  if (!subject) return "legacy";
  if (stage === "middle" && middlePeSubjects.has(subject)) return "middle-pe";
  if (stage === "high" && highInfoSubjects.has(subject)) return "high-info";
  return "legacy";
};

const elementarySubjectKeys: Record<string, string[]> = {
  국어: ["korean"],
  수학: ["math"],
  사회: ["social"],
  과학: ["science"],
  도덕: ["moral"],
  영어: ["english"],
  체육: ["pe"],
  음악: ["music"],
  미술: ["art"],
  실과: ["practical"],
  안전: ["safety"],
  통합: ["integrated", "safety-integrated"],
  // 1·2학년 통합교과는 기재요령상 통합하여 입력하므로 통합 예시집으로 대체한다.
  "바른 생활": ["bareun-life", "integrated"],
  바른생활: ["bareun-life", "integrated"],
  "슬기로운 생활": ["seulgi-life", "integrated"],
  슬기로운생활: ["seulgi-life", "integrated"],
  "즐거운 생활": ["jeulgeoun-life", "integrated"],
  즐거운생활: ["jeulgeoun-life", "integrated"],
};

const elementaryGrades: Record<"1-2" | "3-4" | "5-6", number[]> = {
  "1-2": [2, 1],
  "3-4": [4, 3],
  "5-6": [6, 5],
};

/**
 * 예시집 파일명 접두를 우선순위대로 만든다.
 *
 * 해당 학년 파일 → 학년군 파일(G3-4_art 등) → 학년군 안의 다른 학년 파일 순이다.
 * 학년군 파일이 형제 학년 파일보다 앞인 이유는, 3학년에게 `G3-4_art`가 `G4_art`보다 정확한 대상이기 때문이다.
 */
const elementaryPrefixes = (gradeBand: "1-2" | "3-4" | "5-6", grade?: number): string[] => {
  const grades = elementaryGrades[gradeBand];
  const exact = grade && grades.includes(grade) ? [`G${grade}`] : [];
  const siblings = grades.filter((item) => item !== grade).map((item) => `G${item}`);
  return [...exact, `G${gradeBand}`, ...siblings];
};

const elementaryExample = ({ subject, gradeBand, grade }: SelectPromptInput): PromptPath | null => {
  if (!subject || !gradeBand) return null;
  const keys = elementarySubjectKeys[subject.trim()];
  if (!keys) return null;
  for (const prefix of elementaryPrefixes(gradeBand, grade)) {
    for (const key of keys) {
      const [match] = findPromptsByPrefix(`elementary/examples/${prefix}_${key}`);
      if (match) return match;
    }
  }
  return null;
};

interface AreaMatcher {
  path: PromptPath;
  keywords: string[];
}

// 앞에서부터 검사하므로 좁은 표현이 먼저 와야 한다. `기술형`/`전략형`이 맨 뒤의 `스포츠`보다 앞이다.
const middlePeAreas: AreaMatcher[] = [
  { path: "middle-pe/examples/M1-3_pe_expression_by-level.md", keywords: ["표현", "무용", "리듬", "창작"] },
  { path: "middle-pe/examples/M1-3_pe_health_by-level.md", keywords: ["건강", "체력", "운동"] },
  {
    path: "middle-pe/examples/M1-3_pe_challenge_by-level.md",
    keywords: ["도전", "기술형", "육상", "체조", "달리기", "뜀틀", "멀리뛰기", "높이뛰기", "계주"],
  },
  {
    path: "middle-pe/examples/M1-3_pe_competition_by-level.md",
    keywords: ["경쟁", "전략형", "구기", "축구", "배구", "농구", "배드민턴", "탁구", "스포츠"],
  },
];

const highInfoAreas: AreaMatcher[] = [
  {
    path: "high-info/examples/H_info_computing-system_by-level.md",
    keywords: ["컴퓨팅", "하드웨어", "소프트웨어", "운영체제", "네트워크", "피지컬", "임베디드"],
  },
  {
    path: "high-info/examples/H_info_data_by-level.md",
    keywords: ["데이터", "시각화", "자료구조", "공공데이터", "정제"],
  },
  {
    path: "high-info/examples/H_info_algorithm_by-level.md",
    keywords: ["알고리즘", "프로그래밍", "순서도", "파이썬", "코딩", "정렬", "디버깅", "반복문", "조건문", "재귀"],
  },
  { path: "high-info/examples/H_info_ai_by-level.md", keywords: ["인공지능", "머신러닝", "AI"] },
  {
    path: "high-info/examples/H_info_digital-culture_by-level.md",
    keywords: ["디지털", "윤리", "보안", "저작권", "개인정보", "시민"],
  },
];

const matchArea = (matchers: AreaMatcher[], area?: string): PromptPath | null => {
  if (!area) return null;
  const haystack = area.trim();
  for (const matcher of matchers) {
    if (matcher.keywords.some((keyword) => haystack.includes(keyword))) return matcher.path;
  }
  return null;
};

const examplePathFor = (packId: PromptPackId, input: SelectPromptInput): PromptPath | null => {
  if (packId === "legacy") return null;
  if (input.task === "behavior") {
    // 행발 예시는 중학교분만 확보되어 있다. 초등·고등은 코어 프롬프트만 주입한다.
    return packId === "middle-pe" ? "middle-pe/examples/M1-3_behavior.md" : null;
  }
  if (packId === "elementary") return elementaryExample(input);
  if (packId === "middle-pe") return input.subject === "체육" ? matchArea(middlePeAreas, input.area) : null;
  return matchArea(highInfoAreas, input.area);
};

const separator = "\n\n---\n\n";

/** 학교급·교과에 맞는 system 프롬프트를 조립한다. */
export const selectPrompt = async (input: SelectPromptInput): Promise<SelectedPrompt> => {
  const packId = packIdFor(input);
  if (packId === "legacy") {
    return {
      packId,
      system: input.task === "subject" ? subjectSystemPrompt : behaviorSystemPrompt,
      examplePath: null,
    };
  }

  const pack = packs[packId];
  const parts: string[] = [];
  if (pack.includeCommon) parts.push(await readPrompt("_shared/00_common.md"));
  parts.push(await readPrompt(pack.core));

  const examplePath = examplePathFor(packId, input);
  if (examplePath && hasPrompt(examplePath)) {
    const excerpt = excerptExample(await readPrompt(examplePath), input.officialLevel ?? "B");
    parts.push(`# 예시집 (참고 자료 — 그대로 복사하지 말 것)\n\n${excerpt}`);
  }

  // 출력 계약은 항상 마지막이다. 코어 프롬프트가 지시하는 텍스트 블록 출력 형식을 덮어써야 한다.
  parts.push(await readPrompt(input.task === "subject" ? "_shared/90_output_subject.md" : "_shared/90_output_behavior.md"));

  return { packId, system: parts.join(separator), examplePath: examplePath ?? null };
};

/** 응답에 실어 보낼 프롬프트 버전 문자열. 어느 팩으로 생성했는지 추적할 수 있게 한다. */
export const promptVersionWithPack = (base: string, packId: PromptPackId) => `${base}+${packId}`;
