/** 문자열을 파일로 내려받는다 (CSV·텍스트 내보내기용). */
export const downloadText = (
  filename: string,
  content: string,
  type = "text/plain;charset=utf-8",
) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
