/** 조사·문장부호·공백을 제거해 문장 비교용으로 정규화한다. */
export const normalizeSentence = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\s\p{P}]+/gu, "")
    .replace(/(은|는|이|가|을|를|에|에서|으로|로|와|과|도|만)/g, "")
    .toLowerCase();

/** 두 문장의 n-그램 Dice 유사도 (0~1) */
export const ngramSimilarity = (left: string, right: string, size = 2) => {
  const grams = (value: string) => {
    const normalized = normalizeSentence(value);
    const result = new Set<string>();
    for (let index = 0; index <= normalized.length - size; index += 1) {
      result.add(normalized.slice(index, index + size));
    }
    return result;
  };
  const a = grams(left);
  const b = grams(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return (2 * intersection) / (a.size + b.size);
};

/** 후보 평어가 이미 사용한 문장과 (조사·어미만 바꾼 수준으로) 너무 비슷한지 판단한다. */
export const isSubjectSentenceTooSimilar = (candidate: string, usedSentences: string[]) => {
  const normalized = normalizeSentence(candidate);
  return usedSentences.some((used) => {
    if (normalizeSentence(used) === normalized) return true;
    return ngramSimilarity(candidate, used) >= 0.8;
  });
};
