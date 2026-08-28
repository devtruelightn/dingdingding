import type { Theme } from "@/types";

export const themeNames: Record<Theme, string> = {
  lavender: "미리캔버스",
  mint: "민트",
  peach: "피치",
  sky: "스카이",
  butter: "버터 옐로",
  rose: "로즈",
  dark: "다크모드",
  system: "시스템 설정",
};

/** 테마 선택 버튼의 미리보기 색상 */
export const themeSwatch: Record<Theme, string> = {
  lavender: "#d7c9ff",
  mint: "#b9eedc",
  peach: "#ffcbb8",
  sky: "#b9dcf8",
  butter: "#ffe696",
  rose: "#f7bfd3",
  dark: "#332d47",
  system: "linear-gradient(90deg,#eee 50%,#332d47 50%)",
};

export const themeOrder = Object.keys(themeNames) as Theme[];
