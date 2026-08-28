/** 문자열의 UTF-8 바이트 길이 (NEIS 글자 수 제한 확인용) */
export const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** 스프레드시트 수식 주입(=, +, -, @로 시작하는 셀)을 무력화한다. */
export const escapeSpreadsheetCell = (value: unknown) => {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

/** CSV 한 셀을 큰따옴표로 감싸고 이스케이프한다. */
export const csvCell = (value: unknown) => {
  const escaped = escapeSpreadsheetCell(value).replace(/"/g, '""');
  return `"${escaped}"`;
};
