/**
 * 1·2단계 진입 화면이 공유하는 선택 카드 스타일.
 * 기본은 연한 톤으로 두고 hover에서만 브랜드 색을 강조해, 어느 항목도
 * 미리 선택된 것처럼 보이지 않게 한다. 크기는 사용하는 쪽에서 덧붙인다.
 */
export const choiceCardClass =
  "group flex flex-col items-center justify-center rounded-3xl border-2 border-primary/20 bg-card shadow-sm transition hover:-translate-y-1.5 hover:border-primary hover:shadow-lg";

export const choiceBadgeClass =
  "grid place-items-center rounded-3xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white";

export const choiceLabelClass = "tracking-tight transition-colors group-hover:text-primary-dark";
