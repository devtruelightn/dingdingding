import type { PerformanceRow } from "@/lib/files";

/**
 * 항목 이름이 가리키는 수행 동사. 학생이 그 칸에서 실제로 한 일을 나타낸다.
 * 새로운 사실을 보태지 않도록 동사만 정하고, 내용은 학생 글에서 가져온다.
 */
const ASPECT_VERBS: [RegExp, string[]][] = [
  [/개념|원리|정의/u, ["정리함", "체계적으로 정리함", "개념을 명확히 설명함"]],
  [/진화|발전|변화|동향/u, ["설명함", "흐름을 따라 설명함", "발전 과정을 짚어 설명함"]],
  [/영향|사회|활용|사례/u, ["분석함", "사례를 들어 분석함", "구체적으로 분석함"]],
  [/한계|비판|문제|쟁점/u, ["짚어냄", "비판적으로 짚어냄", "근거를 들어 지적함"]],
  [/진로|연계|전공|미래/u, ["연결지어 서술함", "진로와 연결지어 풀어냄", "자신의 관심과 연결해 서술함"]],
  [/소감|성찰|느낀/u, ["밝힘", "성찰한 내용을 밝힘", "배운 점을 정리해 밝힘"]],
];

const DEFAULT_VERBS = ["정리함", "구체적으로 정리함", "핵심을 짚어 정리함"];

const verbFor = (label: string, variant: number) => {
  const options = ASPECT_VERBS.find(([pattern]) => pattern.test(label))?.[1] ?? DEFAULT_VERBS;
  return options[variant % options.length];
};

const OPENINGS = [
  (topic: string) => `'${topic}'${particleFor(topic, "을", "를")} 주제로 탐구함.`,
  (topic: string) => `'${topic}'${particleFor(topic, "을", "를")} 주제로 선택해 스스로 조사함.`,
  (topic: string) => `'${topic}'${particleFor(topic, "을", "를")} 주제로 삼아 자료를 찾아 정리함.`,
];

const CLOSINGS = [
  (career: string) => `희망 진로인 ${career} 분야와 연결지어 탐구를 확장함.`,
  (career: string) => `${career} 분야로의 진로와 연결지어 배운 내용을 넓힘.`,
  (career: string) => `관심 분야인 ${career}와 이어지는 지점을 스스로 찾아냄.`,
];

/**
 * 받침 유무로 조사만 고른다.
 * 괄호나 영문으로 끝나는 항목 이름이 있어 마지막 한글 글자를 기준으로 삼는다.
 */
export const particleFor = (word: string, withFinal: string, withoutFinal: string) => {
  const hangul = word.trim().match(/[가-힣](?=[^가-힣]*$)/u);
  if (!hangul) return withFinal;
  return (hangul[0].charCodeAt(0) - 0xac00) % 28 ? withFinal : withoutFinal;
};

/** 평서형 종결을 생기부 명사형으로 바꾼다. 규칙에 없으면 손대지 않는다. */
const ENDINGS: [RegExp, string][] = [
  [/(수 있다)$/u, "수 있음"],
  [/(수 없다)$/u, "수 없음"],
  [/있다$/u, "있음"],
  [/없다$/u, "없음"],
  [/이다$/u, "임"],
  [/했다$/u, "함"],
  [/였다$/u, "였음"],
  [/았다$/u, "았음"],
  [/었다$/u, "었음"],
  [/싶다$/u, "싶어 함"],
  [/많다$/u, "많음"],
  [/높다$/u, "높음"],
  [/같다$/u, "같음"],
];

/**
 * "~ㄴ다"로 끝나는 현재형은 받침 ㄴ을 ㅁ으로 바꿔 명사형이 된다.
 * (한다→함, 낸다→냄, 진다→짐, 간다→감, 쓴다→씀)
 */
const NIEUN = 4;
const MIEUM = 16;
const convertEnding = (value: string): string => {
  const matched = ENDINGS.find(([pattern]) => pattern.test(value));
  if (matched) return value.replace(matched[0], matched[1]);
  return nieunToMieum(value) ?? value;
};

const nieunToMieum = (value: string) => {
  if (!value.endsWith("다") || value.length < 2) return null;
  const stem = value.slice(0, -1);
  const code = stem.charCodeAt(stem.length - 1) - 0xac00;
  if (code < 0 || code > 11171 || code % 28 !== NIEUN) return null;
  return `${stem.slice(0, -1)}${String.fromCharCode(0xac00 + code - NIEUN + MIEUM)}`;
};

const toNounEnding = (sentence: string) => {
  const value = sentence
    .trim()
    .replace(/[.!?]+$/u, "")
    // 쉼표 앞에서 끝나는 평서형도 바꿔야 한 문장 안에서 문체가 섞이지 않는다.
    .replace(/([가-힣]{2,}다)(?=\s*[,，])/gu, (match) => convertEnding(match))
    .trim();
  return convertEnding(value);
};

/** 학생이 적지 않은 칸 */
const isBlank = (text: string) =>
  !text || /^(-+|없음|미작성|작성하지\s*않았|해당\s*없)/u.test(text.trim());

/** "희망 진로: 항공우주공학자, 전공: 물리" → "항공우주공학자, 물리" */
const cleanCareer = (career: string) =>
  career
    .replace(/(희망\s*)?(진로|전공)\s*[:：]\s*/gu, "")
    .replace(/\s*[,·/]\s*/gu, ", ")
    .replace(/\s+/gu, " ")
    .trim();

/** 조사로 끝나 뒤가 잘린 티가 나는 꼬리를 떼어낸다. */
const dropDanglingTail = (text: string) =>
  text.replace(/\s+\S*(이|가|은|는|을|를|와|과|의|에|로|으로|에서|에게)$/u, "").trim();

/**
 * 항목 한 칸에서 앞부분을 예산만큼 가져와 명사형으로 다듬는다.
 *
 * 온전한 문장 단위로만 담고, 첫 문장부터 예산을 넘으면 쉼표 같은 절 경계에서
 * 끊는다. 글자 수만 보고 자르면 "컴퓨터가"처럼 말이 끊긴 채 남는다.
 */
const condense = (text: string, budget: number, offset = 0) => {
  const flat = text.replace(/\s+/gu, " ").trim();
  const all = flat.split(/(?<=[.!?])\s+/u).filter(Boolean);
  // 다시 생성할 때 다른 대목이 뽑히도록 시작 문장을 옮긴다.
  const start = all.length > 1 ? offset % all.length : 0;
  const sentences = [...all.slice(start), ...all.slice(0, start)];
  const picked: string[] = [];
  for (const sentence of sentences) {
    const next = [...picked, sentence].join(" ");
    if (picked.length && next.length > budget) break;
    picked.push(sentence);
    if (next.length >= budget) break;
  }

  // 고른 문장을 모두 명사형으로 바꿔야 문체가 섞이지 않는다.
  const joined = (picked.length ? picked : [flat])
    .map((sentence) => toNounEnding(sentence))
    .filter(Boolean)
    .join(", ");
  if (joined.length <= budget) return joined;

  const cut = joined.slice(0, budget);
  const comma = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("， "));
  if (comma > budget * 0.4) return cut.slice(0, comma);
  const space = cut.lastIndexOf(" ");
  return dropDanglingTail(space > budget * 0.4 ? cut.slice(0, space) : cut);
};

export interface PerformanceDraftOptions {
  /** 한 학생 세특의 목표 길이(글자). NEIS 과세특 한도 안에 들도록 잡는다. */
  totalBudget?: number;
  /** 다시 생성할 때마다 올리는 값. 뽑는 대목과 서술 동사를 바꾼다. */
  variant?: number;
}

/**
 * 수행평가 서술을 근거로 과목별 세부능력 및 특기사항 초안을 만든다.
 *
 * 학생이 쓴 내용만 압축해 쓰고, 항목 이름으로 "무엇을 했는지"를 나타내는
 * 동사만 덧붙인다. 새로운 사실은 넣지 않는다.
 */
export const createPerformanceDraft = (
  row: PerformanceRow,
  { totalBudget = 520, variant = 0 }: PerformanceDraftOptions = {},
): string => {
  const filled = row.aspects.filter((aspect) => !isBlank(aspect.text));
  if (!filled.length) return "";

  const career = cleanCareer(row.career);
  const opening = row.topic ? `${OPENINGS[variant % OPENINGS.length](row.topic)} ` : "";
  const closing =
    career && !/^-+$/u.test(career) ? ` ${CLOSINGS[variant % CLOSINGS.length](career)}` : "";
  const perAspect = Math.max(50, Math.floor((totalBudget - opening.length - closing.length) / filled.length) - 14);

  const clauses = filled.map((aspect, index) => {
    const body = condense(aspect.text, perAspect, variant ? variant + index : 0);
    const label = `${aspect.label}${particleFor(aspect.label, "을", "를")}`;
    return `${body} 등 ${label} ${verbFor(aspect.label, variant)}.`;
  });

  return `${opening}${clauses.join(" ")}${closing}`.replace(/\s+/gu, " ").trim();
};
