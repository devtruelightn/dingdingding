const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /\b(?:01[016789][- ]?\d{3,4}[- ]?\d{4}|0\d{1,2}[- ]?\d{3,4}[- ]?\d{4})\b/g;
const residentPattern = /\b\d{6}[- ]?[1-4]\d{6}\b/g;
const studentNumberPattern = /\b\d{1,2}학년\s*\d{1,2}반\s*\d{1,2}번\b/g;

export interface Redaction {
  type: "이메일" | "전화번호" | "주민등록번호 형태" | "학번 형태" | "학생 이름";
  original: string;
  replacement: string;
}

/** 텍스트에서 개인정보로 보이는 부분과 알려진 학생 이름을 가린다. */
export const anonymizeText = (value: string, knownNames: string[] = []) => {
  const redactions: Redaction[] = [];
  let text = value;
  const replace = (pattern: RegExp, type: Redaction["type"], replacement: string) => {
    text = text.replace(pattern, (original) => {
      redactions.push({ type, original, replacement });
      return replacement;
    });
  };
  replace(emailPattern, "이메일", "[이메일]");
  replace(phonePattern, "전화번호", "[전화번호]");
  replace(residentPattern, "주민등록번호 형태", "[민감번호]");
  replace(studentNumberPattern, "학번 형태", "[학번]");
  [...new Set(knownNames.filter((name) => name.trim().length >= 2))]
    .sort((a, b) => b.length - a.length)
    .forEach((name) => {
      const pattern = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      text = text.replace(pattern, (original) => {
        redactions.push({ type: "학생 이름", original, replacement: "[학생]" });
        return "[학생]";
      });
    });
  return { text, redactions };
};
