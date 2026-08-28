// selectPrompt 라우팅 수동 점검용 스크립트. npm run build 후 `node tools/smoke-prompts.mjs` 로 실행한다.
import { selectPrompt } from "../lib/prompts/index.js";

const cases = [
  { label: "초등 3학년 국어 세특", input: { stage: "elementary", task: "subject", subject: "국어", area: "읽기", gradeBand: "3-4", grade: 3, officialLevel: "A" } },
  { label: "초등 3학년 미술 세특 (학년군 파일)", input: { stage: "elementary", task: "subject", subject: "미술", area: "표현", gradeBand: "3-4", grade: 3, officialLevel: "B" } },
  { label: "초등 4학년 국어 세특 (학년 미전달)", input: { stage: "elementary", task: "subject", subject: "국어", area: "읽기", gradeBand: "3-4", officialLevel: "A" } },
  { label: "초등 1학년 바른생활 세특", input: { stage: "elementary", task: "subject", subject: "바른 생활", area: "우리는 누구로 살아갈까", gradeBand: "1-2", officialLevel: "C" } },
  { label: "초등 6학년 체육 세특", input: { stage: "elementary", task: "subject", subject: "체육", area: "스포츠", gradeBand: "5-6", officialLevel: "B" } },
  { label: "중학교 체육 경쟁(배구) 세특", input: { stage: "middle", task: "subject", subject: "체육", area: "경쟁 영역 배구", officialLevel: "B" } },
  { label: "중학교 체육 건강(체력) 세특", input: { stage: "middle", task: "subject", subject: "체육", area: "건강 체력", officialLevel: "C" } },
  { label: "중학교 음악 세특 (예시집 없음)", input: { stage: "middle", task: "subject", subject: "음악", area: "연주", officialLevel: "A" } },
  { label: "중학교 국어 세특 (폴백)", input: { stage: "middle", task: "subject", subject: "국어", area: "읽기", officialLevel: "B" } },
  { label: "고등학교 정보 알고리즘 세특", input: { stage: "high", task: "subject", subject: "정보", area: "알고리즘과 프로그래밍", officialLevel: "A" } },
  { label: "고등학교 정보 인공지능 세특", input: { stage: "high", task: "subject", subject: "정보", area: "인공지능", officialLevel: "C" } },
  { label: "고등학교 수학 세특 (폴백)", input: { stage: "high", task: "subject", subject: "수학", area: "함수", officialLevel: "B" } },
  { label: "초등 행발", input: { stage: "elementary", task: "behavior" } },
  { label: "중학교 행발", input: { stage: "middle", task: "behavior" } },
  { label: "고등학교 행발", input: { stage: "high", task: "behavior" } },
];

const rows = [];
for (const { label, input } of cases) {
  const result = await selectPrompt(input);
  rows.push({
    케이스: label,
    팩: result.packId,
    예시집: result.examplePath ?? "-",
    글자수: result.system.length,
  });
}
console.table(rows);

const sample = await selectPrompt({ stage: "middle", task: "subject", subject: "체육", area: "경쟁 영역 배구", officialLevel: "C" });
console.log("\n=== 중학교 체육 경쟁 / 성취도 하 — 조립 결과 섹션 표제 ===");
console.log(
  sample.system
    .split("\n")
    .filter((line) => /^#{1,3} /.test(line))
    .join("\n"),
);
