import { officialTextFor } from "@/lib/curriculum";
import type { CurriculumStandard, OfficialLevel, SchoolLevel } from "@/types";
import { isSubjectSentenceTooSimilar, normalizeSentence } from "./similarity";

const awkwardSubjectPatterns = [
  /할 수 있는 (?:수행|과정|모습|능력|역량)/u,
  /하는 수행이 능숙함/u,
  /하는 수행 과정이 돋보임/u,
  /하는 과정에서 강점이/u,
  /하는 모습을 안정적으로 보임/u,
  /하는 방법을 이해하고 실제 수행에/u,
];

/** 기계적으로 결합된 어색한 성취 표현이 있는지 검사한다. */
export const hasAwkwardSubjectPattern = (value: string) =>
  awkwardSubjectPatterns.some((pattern) => pattern.test(value));

/** 성취기준 원문("~할 수 있다")을 생활기록부 명사형("~함")으로 변환한다. */
export const toRecordStyle = (source: string) => {
  const value = source
    .trim()
    .replace(/[.]$/, "")
    .replace(/쓸 수 있고/gu, "쓰고")
    .replace(/읽을 수 있고/gu, "읽고")
    .replace(/들을 수 있고/gu, "듣고")
    .replace(/볼 수 있고/gu, "보고")
    .replace(/할 수 있고/gu, "하며");
  const replacements: [RegExp, string][] = [
    [/고쳐 쓸 수 있다$/u, "고쳐 씀"],
    [/글을 쓸 수 있다$/u, "글을 씀"],
    [/읽을 수 있다$/u, "읽음"],
    [/들을 수 있다$/u, "들음"],
    [/볼 수 있다$/u, "살펴봄"],
    [/말할 수 있다$/u, "말함"],
    [/할 수 있다$/u, "함"],
    [/쓴다$/u, "씀"],
    [/듣는다$/u, "들음"],
    [/읽는다$/u, "읽음"],
    [/말한다$/u, "말함"],
    [/지닌다$/u, "지님"],
    [/한다$/u, "함"],
    [/안다$/u, "앎"],
    [/이해한다$/u, "이해함"],
    [/가진다$/u, "가짐"],
    [/보인다$/u, "보임"],
    [/있다$/u, "있음"],
  ];
  const converted = replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value,
  );
  return `${converted}.`;
};

const subjectLexicalAlternatives: Array<[RegExp, string[]]> = [
  [/여러 유형의/gu, ["다양한 유형의", "여러 종류의"]],
  [/글의 의미를/gu, ["글에 담긴 의미를", "글이 전달하는 의미를"]],
  [/글 전체를 대상으로/gu, ["글 전체를 살피며", "글의 전체적인 내용을 고려하여"]],
  [/통일성 있게/gu, ["일관성이 드러나도록", "통일성을 갖추도록"]],
  [/점검·조정하며/gu, ["점검하고 조정하면서", "살피고 조정하며"]],
  [/정확하게/gu, ["정확히", "바르게"]],
  [/효과적으로/gu, ["효과가 잘 드러나도록", "알맞은 방식으로"]],
  [/유창하게/gu, ["자연스럽고 막힘없이", "매끄럽게"]],
  [/능동적으로/gu, ["주도적으로", "스스로"]],
  [/중요한/gu, ["핵심적인", "중요도가 높은"]],
  [/다양한/gu, ["여러", "여러 가지"]],
  [/알맞게/gu, ["적절하게", "상황에 맞게"]],
  [/바르게/gu, ["올바르게", "정확히"]],
  [/특징/gu, ["특성", "두드러진 점"]],
  [/방법/gu, ["방식", "방법과 절차"]],
  [/파악하고/gu, ["파악하여", "살펴 이해하고"]],
  [/이해하고/gu, ["이해하여", "이해한 뒤"]],
  [/활용하여/gu, ["활용해", "바탕으로"]],
  [/사용하여/gu, ["활용하여", "사용해"]],
  [/비교하여/gu, ["비교하고", "서로 견주어"]],
  [/고려하여/gu, ["고려해", "고려하고"]],
  [/구분하여/gu, ["구분하고", "나누어 살피며"]],
  [/설명하고/gu, ["설명하며", "말로 풀어내고"]],
  [/계산하고/gu, ["계산하며", "계산한 뒤"]],
  [/계산 원리를/gu, ["계산의 원리를", "계산 방법의 원리를"]],
  [/표현하고/gu, ["표현하며", "드러내고"]],
  [/듣고/gu, ["들으며", "들은 뒤"]],
  [/읽고/gu, ["읽으며", "읽은 뒤"]],
  [/쓰고/gu, ["작성하고", "글로 나타내고"]],
  [/보고/gu, ["살펴보고", "본 뒤"]],
];

const toAttributiveAchievement = (sentence: string) => {
  const endings: Array<[RegExp, string]> = [
    [/할 수 있음\.$/u, "하는"],
    [/고쳐 씀\.$/u, "고쳐 쓰는"],
    [/글을 씀\.$/u, "글을 쓰는"],
    [/읽음\.$/u, "읽는"],
    [/들음\.$/u, "듣는"],
    [/살펴봄\.$/u, "살펴보는"],
    [/말함\.$/u, "말하는"],
    [/설명함\.$/u, "설명하는"],
    [/표현함\.$/u, "표현하는"],
    [/이해함\.$/u, "이해하는"],
    [/파악함\.$/u, "파악하는"],
    [/활용함\.$/u, "활용하는"],
    [/수행함\.$/u, "수행하는"],
    [/있음\.$/u, "있는"],
    [/함\.$/u, "하는"],
  ];
  const matched = endings.find(([pattern]) => pattern.test(sentence));
  return matched ? sentence.replace(matched[0], matched[1]) : null;
};

const subjectEndingVariants = (sentence: string, schoolLevel: SchoolLevel) => {
  const attributive = toAttributiveAchievement(sentence);
  if (!attributive) return [sentence];
  const prefixes =
    schoolLevel === "매우 잘함" || schoolLevel === "잘함"
      ? ["", "정확하게 ", "능숙하게 ", "주도적으로 ", "세심하게 ", "체계적으로 ", "꼼꼼하게 ", "충실하게 ", "적극적으로 ", "안정적으로 ", "효과적으로 ", "배운 내용을 활용하여 ", "핵심을 정확히 살피며 "]
      : schoolLevel === "보통"
        ? ["", "차근차근 ", "알맞게 ", "기준에 따라 ", "순서에 맞게 ", "꾸준히 ", "충실하게 ", "배운 내용을 활용하여 ", "핵심을 살피며 ", "필요한 내용을 확인하며 "]
        : ["", "차근차근 ", "안내에 따라 ", "기초 내용을 확인하며 ", "배운 내용을 떠올리며 ", "과정을 하나씩 살피며 ", "꾸준히 연습하며 "];
  const variants = new Set<string>([sentence]);
  prefixes
    .filter((prefix) => prefix && !(prefix.startsWith("안내") && sentence.startsWith("안내")))
    .forEach((prefix) => variants.add(`${prefix}${sentence}`));
  const addEndings = (endings: string[]) => endings.forEach((value) => variants.add(value));
  if (schoolLevel === "매우 잘함" || schoolLevel === "잘함") {
    addEndings([
      `${attributive} 능력이 우수함.`,
      `${attributive} 데 능숙함.`,
      `${attributive} 과정이 돋보임.`,
      `${attributive} 역량을 충실히 갖춤.`,
      `${attributive} 능력을 고르게 발휘함.`,
      `${attributive} 능력이 뛰어남.`,
      `${attributive} 능력을 안정적으로 발휘함.`,
    ]);
    return [...variants].filter((value) => !hasAwkwardSubjectPattern(value));
  }
  if (schoolLevel === "보통") {
    addEndings([
      `${attributive} 능력을 갖추고 있음.`,
      `${attributive} 데 필요한 내용을 이해함.`,
      `${attributive} 모습을 보임.`,
      `${attributive} 능력이 안정적으로 나타남.`,
      `${attributive} 능력을 충실히 발휘함.`,
      `${attributive} 경험을 통해 능력을 기름.`,
      `${attributive} 방법을 이해하고 적용함.`,
    ]);
    return [...variants].filter((value) => !hasAwkwardSubjectPattern(value));
  }
  addEndings([
    `${attributive} 능력을 기르기 위해 꾸준히 노력함.`,
    `${attributive} 활동에 차근차근 참여함.`,
    `${attributive} 경험을 쌓으며 조금씩 성장함.`,
    `${attributive} 방법을 익혀 가고 있음.`,
    `${attributive} 능력을 기르려는 태도를 보임.`,
    `${attributive} 과정을 이어 가기 위해 노력함.`,
    `${attributive} 연습에 꾸준히 참여함.`,
  ]);
  return [...variants].filter((value) => !hasAwkwardSubjectPattern(value));
};

const subjectCandidateCache = new Map<string, string[]>();

const createGroundedSentenceCandidates = ({
  standard,
  officialLevel,
  schoolLevel,
}: {
  standard: CurriculumStandard;
  officialLevel: OfficialLevel;
  schoolLevel: SchoolLevel;
}) => {
  const cacheKey = `${standard.standardId}:${officialLevel}:${schoolLevel}`;
  const cached = subjectCandidateCache.get(cacheKey);
  if (cached) return cached;
  const base = toRecordStyle(officialTextFor(standard, officialLevel));
  const source =
    schoolLevel === "매우 노력요함"
      ? base.replace(/부분적으로/gu, "기초적인 수준에서 부분적으로")
      : base;
  const lexicalVariants = new Set<string>([source]);
  subjectLexicalAlternatives.forEach(([pattern, replacements]) => {
    if (lexicalVariants.size >= 18) return;
    const snapshot = [...lexicalVariants].slice(0, 8);
    snapshot.forEach((value) => {
      if (lexicalVariants.size >= 18) return;
      pattern.lastIndex = 0;
      if (!pattern.test(value)) return;
      replacements.forEach((replacement) => {
        if (lexicalVariants.size >= 18) return;
        pattern.lastIndex = 0;
        lexicalVariants.add(value.replace(pattern, replacement).replace(/\s+/gu, " ").trim());
      });
    });
  });
  const candidates = new Set<string>();
  [...lexicalVariants].forEach((value) => {
    subjectEndingVariants(value, schoolLevel).forEach((variant) =>
      candidates.add(variant.replace(/\s+/gu, " ").trim()),
    );
  });
  const result = [...candidates].filter((value) => !hasAwkwardSubjectPattern(value)).slice(0, 1200);
  subjectCandidateCache.set(cacheKey, result);
  return result;
};

/** 공식 성취수준 원문만 변환해 하나의 평어 초안을 만든다. */
export const createGroundedSentence = ({
  standard,
  officialLevel,
  schoolLevel,
  seed = 0,
}: {
  standard: CurriculumStandard;
  officialLevel: OfficialLevel;
  schoolLevel: SchoolLevel;
  seed?: number;
}) => {
  const candidates = createGroundedSentenceCandidates({ standard, officialLevel, schoolLevel });
  return (
    candidates[Math.abs(seed) % candidates.length] ??
    toRecordStyle(officialTextFor(standard, officialLevel))
  );
};

/** 이미 사용한 문장과 겹치지 않는 평어 초안을 만든다. */
export const createUniqueGroundedSentence = ({
  standard,
  officialLevel,
  schoolLevel,
  usedSentences,
  seed = 0,
}: {
  standard: CurriculumStandard;
  officialLevel: OfficialLevel;
  schoolLevel: SchoolLevel;
  usedSentences: string[];
  seed?: number;
}) => {
  const candidates = createGroundedSentenceCandidates({ standard, officialLevel, schoolLevel });
  const used = new Set(usedSentences.map(normalizeSentence));
  const available = candidates.filter((candidate) => !used.has(normalizeSentence(candidate)));
  if (!available.length) {
    return (
      candidates[Math.abs(seed) % candidates.length] ??
      toRecordStyle(officialTextFor(standard, officialLevel))
    );
  }
  const offset = Math.abs(seed) % available.length;
  const rotated = [...available.slice(offset), ...available.slice(0, offset)];
  const sampleSize = Math.min(32, rotated.length);
  const sample = Array.from(
    { length: sampleSize },
    (_, index) => rotated[Math.floor((index * rotated.length) / sampleSize)],
  );
  return sample.find((candidate) => !isSubjectSentenceTooSimilar(candidate, usedSentences)) ?? rotated[0];
};
