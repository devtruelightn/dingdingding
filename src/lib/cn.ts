/** 조건부 className 결합 유틸 (falsy 값은 무시). */
export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");
