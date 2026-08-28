import type { Student } from "@/types";

const cleanCell = (value: string) => value.replace(/[\u0000-\u001f]/g, " ").trim();

/** 붙여넣은 명단 텍스트(이름만 / 번호+이름 / CSV·탭)를 학생 목록으로 파싱한다. */
export const parseRoster = (input: string): { students: Student[]; warnings: string[] } => {
  const warnings: string[] = [];
  const seen = new Set<number>();
  const students: Student[] = [];
  let nextAutomaticNumber = 1;
  input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const cells = line.split(/\t|,/).map(cleanCell).filter(Boolean);
      if (index === 0 && cells.some((cell) => /번호|이름/.test(cell))) return;
      const fallback = line.match(/^\s*(\d{1,3})\s+(.+?)\s*$/);
      const numberText = cells[0]?.match(/^\d+$/) ? cells[0] : fallback?.[1];
      const name = cells.length >= 2 ? cells[1] : fallback?.[2] ?? cells[0];
      if (!name) {
        warnings.push(`${index + 1}행을 읽지 못했습니다.`);
        return;
      }
      while (seen.has(nextAutomaticNumber)) nextAutomaticNumber += 1;
      const number = numberText ? Number(numberText) : nextAutomaticNumber;
      if (seen.has(number)) {
        warnings.push(`${number}번이 중복되어 제외되었습니다.`);
        return;
      }
      if (name.length > 30) warnings.push(`${number}번 이름이 비정상적으로 깁니다.`);
      if (/^[=+\-@]/.test(name)) warnings.push(`${number}번 이름의 수식 문자를 일반 텍스트로 처리했습니다.`);
      seen.add(number);
      nextAutomaticNumber = Math.max(nextAutomaticNumber, number + 1);
      students.push({ id: crypto.randomUUID(), number, name: name.slice(0, 30) });
    });
  return { students: students.sort((a, b) => a.number - b.number), warnings };
};
