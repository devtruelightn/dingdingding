/** 학생 이름을 화면에서 가린다. 예: "김하늘" → "김○○" */
export const maskName = (name: string) => {
  if (!name) return "이름 없음";
  if (name.length === 1) return `${name}○`;
  return `${name[0]}${"○".repeat(Math.max(1, name.length - 1))}`;
};
