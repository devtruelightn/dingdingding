import { describe, expect, it } from "vitest";
import report from "@/data/curriculum-report.json";
import { officialLevelFor, schoolLevelsFor, standards } from "@/lib/curriculum";
import { anonymizeText } from "@/lib/privacy";
import { parseRoster } from "@/lib/roster";
import { createBehaviorSentence, createGroundedSentence, createUniqueGroundedSentence, escapeSpreadsheetCell, hasAwkwardBehaviorMeta, hasAwkwardSubjectPattern, isSubjectSentenceTooSimilar, ngramSimilarity, utf8Bytes } from "@/lib/text";
import { analyzeAssessmentPlan, parseAssessmentResultText, parseExtractedText, splitEvaluationBlocks } from "@/lib/files";
import { isTeacherProfile } from "@/lib/storage";

describe("교육과정 데이터", () => {
  it("611개 코드와 A/B/C 원문을 누락 없이 제공한다", () => {
    expect(standards).toHaveLength(611);
    expect(new Set(standards.map((item) => item.standardCode)).size).toBe(611);
    expect(standards.every((item) => item.standardText && item.levelA && item.levelB && item.levelC && item.sourcePage > 0)).toBe(true);
    expect(report.warnings).toBe(0);
  });

  it("학년군별 기본 과목을 포함한다", () => {
    const subjects = (band: string) => new Set(standards.filter((item) => item.gradeBand === band).map((item) => item.subjectName));
    expect(subjects("1-2")).toEqual(new Set(["국어", "수학", "바른 생활", "슬기로운 생활", "즐거운 생활"]));
    expect(subjects("5-6").has("실과")).toBe(true);
  });
});

describe("평가단계", () => {
  it("3·4·5단계를 공식 A/B/C에 안전하게 대응한다", () => {
    expect(schoolLevelsFor(3)).toEqual(["잘함", "보통", "노력요함"]);
    expect(schoolLevelsFor(4)).toHaveLength(4);
    expect(schoolLevelsFor(5)).toHaveLength(5);
    expect(officialLevelFor("매우 잘함")).toBe("A");
    expect(officialLevelFor("잘함")).toBe("A");
    expect(officialLevelFor("보통")).toBe("B");
    expect(officialLevelFor("노력요함")).toBe("C");
    expect(officialLevelFor("매우 노력요함")).toBe("C");
  });

  it("생성 문장은 해당 공식 수준 원문만 변환한다", () => {
    const standard = standards.find((item) => item.standardCode === "2국01-01")!;
    const sentence = createGroundedSentence({ standard, officialLevel: "B", schoolLevel: "보통", seed: 0 });
    expect(sentence).toContain(standard.levelB.replace(/[.]$/, "").slice(0, 15));
    expect(sentence).not.toContain("창의적");
  });

  it("불필요한 영역·성취기준 메타 문구 없이 성취 행동으로 바로 시작한다", () => {
    const standard = standards.find((item) => item.standardCode === "2국01-01")!;
    const sentence = createGroundedSentence({ standard, officialLevel: "A", schoolLevel: "잘함", seed: 0 });
    expect(sentence).toMatch(/^중요한 내용/u);
    expect(sentence).not.toMatch(/^(해당\s*영역|이\s*영역|해당\s*성취기준|제시된\s*성취기준)/u);
  });

  it("고쳐 쓰기 성취수준을 자연스러운 생활기록부 명사형으로 바꾼다", () => {
    const standard = standards.find((item) => item.standardCode === "6국03-05")!;
    const sentence = createGroundedSentence({ standard, officialLevel: "A", schoolLevel: "잘함", seed: 0 });
    expect(sentence).toContain("쓰기 과정을 능동적으로 점검");
    expect(sentence).toContain("고쳐 씀");
    expect(sentence).not.toContain("쓸 수 있음");
  });

  it("같은 잘함 단계에서 요청한 5개 문장을 서로 다르게 만든다", () => {
    const standard = standards.find((item) => item.standardCode === "4국01-01")!;
    const sentences = Array.from({ length: 5 }, (_, seed) => createGroundedSentence({ standard, officialLevel: "A", schoolLevel: "잘함", seed }));
    expect(new Set(sentences).size).toBe(5);
    expect(sentences.every((sentence) => !sentence.startsWith("해당 영역"))).toBe(true);
  });

  it.each([["6국03-05", 80], ["4국02-01", 40]] as const)("%s 기준으로 연속 %i개의 평어를 한 문장도 겹치지 않게 만든다", (standardCode, count) => {
    const standard = standards.find((item) => item.standardCode === standardCode)!;
    const usedSentences: string[] = [];
    for (let seed = 0; seed < count; seed += 1) {
      const sentence = createUniqueGroundedSentence({ standard, officialLevel: "A", schoolLevel: "잘함", usedSentences, seed });
      expect(usedSentences).not.toContain(sentence);
      usedSentences.push(sentence);
    }
    expect(new Set(usedSentences).size).toBe(count);
  });

  it("다시 생성할 때 조사·어미만 바꾼 유사 문장도 중복으로 판단한다", () => {
    const used = ["쓰기 과정을 점검하고 글 전체의 내용을 통일성 있게 고쳐 씀."];
    expect(isSubjectSentenceTooSimilar("쓰기 과정을 점검하며 글 전체 내용을 통일성 있게 고쳐 씀.", used)).toBe(true);
    expect(isSubjectSentenceTooSimilar("글의 의미를 파악하고 효과적으로 소리 내어 읽음.", used)).toBe(false);
  });

  it("분수 나눗셈 평어를 기계적인 관형절 없이 자연스럽게 구성한다", () => {
    const standard = standards.find((item) => item.standardCode === "6수01-11")!;
    const usedSentences: string[] = [];
    for (let seed = 0; seed < 80; seed += 1) {
      const sentence = createUniqueGroundedSentence({ standard, officialLevel: "A", schoolLevel: "잘함", usedSentences, seed });
      expect(hasAwkwardSubjectPattern(sentence)).toBe(false);
      expect(sentence).not.toContain("설명할 수 있는");
      usedSentences.push(sentence);
    }
    expect(usedSentences[0]).toContain("계산 원리를 설명함");
    expect(new Set(usedSentences).size).toBe(80);
  });
});

describe("명단·개인정보·내보내기", () => {
  it("탭·공백·CSV 명단과 헤더를 인식한다", () => {
    const parsed = parseRoster("번호\t이름\n1\t김하늘\n2 이바다\n3,박새봄");
    expect(parsed.students.map((item) => [item.number, item.name])).toEqual([[1, "김하늘"], [2, "이바다"], [3, "박새봄"]]);
  });

  it("이름만 붙여넣으면 1번부터 자동으로 번호를 붙인다", () => {
    const parsed = parseRoster("김서윤\n김채원\n박새봄\n오혜원");
    expect(parsed.students.map((item) => [item.number, item.name])).toEqual([
      [1, "김서윤"], [2, "김채원"], [3, "박새봄"], [4, "오혜원"],
    ]);
    expect(parsed.warnings).toHaveLength(0);
  });

  it("중복 번호를 제외하고 경고한다", () => {
    const parsed = parseRoster("1 김하늘\n1 이바다");
    expect(parsed.students).toHaveLength(1);
    expect(parsed.warnings[0]).toContain("중복");
  });

  it("학생 이름과 민감정보를 익명화한다", () => {
    const result = anonymizeText("김하늘에게 010-1234-5678로 연락, test@example.com", ["김하늘"]);
    expect(result.text).toBe("[학생]에게 [전화번호]로 연락, [이메일]");
    expect(result.redactions).toHaveLength(3);
  });

  it("Excel 수식 주입을 막는다", () => {
    expect(escapeSpreadsheetCell("=HYPERLINK('x')")).toMatch(/^'/);
    expect(escapeSpreadsheetCell("김하늘")).toBe("김하늘");
  });
});

describe("문장 도구", () => {
  it("UTF-8 바이트 수를 계산한다", () => expect(utf8Bytes("가A")).toBe(4));
  it("정확 중복과 유사 문장을 탐지한다", () => {
    expect(ngramSimilarity("문장을 정확하게 이해함.", "문장을 정확하게 이해함.")).toBe(1);
    expect(ngramSimilarity("문장을 정확하게 이해함.", "전혀 다른 체육 활동임.")).toBeLessThan(.55);
  });

  it("행발 키워드를 조사 오류나 메타 문구 없이 자연스럽게 구성한다", () => {
    const keywords = ["디지털 활용", "질문", "독서", "자기주도성"];
    const sentences = keywords.flatMap((keyword) => [
      createBehaviorSentence(keyword, "잘함", 0),
      createBehaviorSentence(keyword, "보통", 1),
      createBehaviorSentence(keyword, "노력요함", 2),
    ]);
    expect(sentences.every((sentence) => !hasAwkwardBehaviorMeta(sentence))).toBe(true);
    expect(sentences.join(" ")).not.toContain("관련한 관찰 내용을 바탕으로");
    expect(sentences.join(" ")).not.toContain("디지털 활용와");
  });

  it("행발 새로고침용 문장을 10가지 이상의 구조와 종결로 구성한다", () => {
    const sentences = Array.from({ length: 12 }, (_, variant) => createBehaviorSentence("책임감", "보통", variant));
    expect(new Set(sentences).size).toBe(12);
    expect(sentences.filter((sentence) => /꾸준히 보임|안정적으로 나타남|지속적으로 보임/u.test(sentence))).toHaveLength(0);
  });
});

describe("평가계획 매핑", () => {
  it("CSV의 성취기준 코드를 공식 원문과 대조한다", async () => {
    const file = new File(["과목,평가영역,성취기준,평가요소,평가시기\n국어,듣기·말하기,2국01-01,순서 파악,9월"], "plan.csv", { type: "text/csv" });
    const rows = await analyzeAssessmentPlan(file, standards);
    expect(rows[0].standardCode).toBe("2국01-01");
    expect(rows[0].subject).toBe("국어");
    expect(rows[0].status).toBe("공식 PDF와 정확히 일치");
    expect(rows[0].confirmed).toBe(true);
  });

  it("이전 교육과정 코드의 문장을 2022 개정 유사 기준으로 추천한다", async () => {
    const csv = '과목,평가영역,성취기준\n수학,도형과 측정,"6수02-06 각기둥과 각뿔을 알고, 구성 요소와 성질을 탐구하고 설명할 수 있다."';
    const rows = await analyzeAssessmentPlan(new File([csv], "old-plan.csv", { type: "text/csv" }), standards);
    expect(rows[0].status).toBe("유사 기준 발견");
    expect(rows[0].officialStandardCode).toBe("6수03-05");
    expect(rows[0].resolution).toContain("추천 원문");
    expect(rows[0].confirmed).toBe(true);
  });

  it("코드는 같고 문구가 다르면 학교 문구와 공식 원문을 모두 보존한다", async () => {
    const csv = '과목,평가영역,성취기준\n수학,수와 연산,"6수01-14 (자연수)÷(자연수) 예에서 나눗셈의 몫을 소수로 나타낼 수 있다."';
    const rows = await analyzeAssessmentPlan(new File([csv], "changed-plan.csv", { type: "text/csv" }), standards);
    expect(rows[0].status).toBe("원문 불일치");
    expect(rows[0].confirmed).toBe(true);
    expect(rows[0].uploadedStandardText).toContain("예에서");
    expect(rows[0].officialStandardText).toContain("에서 나눗셈의 몫");
  });

  // PDF에서 뽑은 글자는 `[6 국 03-05]`처럼 글리프 사이가 벌어져 나온다.
  it("PDF 추출 텍스트의 띄어쓰기가 섞인 코드를 정규화한다", () => {
    const text =
      "과목 교육과정 성취기준 국어 [6 국 03-05] 쓰기 과정을 점검⋅조정하며 글을 쓰고 , " +
      "글 전체를 대상으로 통일성 있게 고쳐 쓴다 . 2. 바르게 고쳐 써요 ( 쓰기 ) 잘함 글 , 문단 , " +
      "문장 수준의 고쳐 쓰기 방법을 적용함 . [6 음 01-03] 소리의 어울림을 생각하며 다양한 방법으로 함께 표현한다 . 1. 음악으로";
    const rows = parseExtractedText(text);
    expect(rows.map((row) => row.standardCode)).toEqual(["6국03-05", "6음01-03"]);
    // 원문은 첫 `~다.`까지만 잘라 단원·평가기준이 섞이지 않아야 한다.
    expect(rows[0].standardText).toContain("고쳐 쓴다 .");
    expect(rows[0].standardText).not.toContain("바르게 고쳐 써요");
  });

  it("학교가 자체 편성한 긴 과목 코드도 행으로 남긴다", () => {
    const rows = parseExtractedText("[6 국사상 01-01] 글의 구조를 해체하고 편향과 왜곡을 분석한다 .");
    expect(rows[0].standardCode).toBe("6국사상01-01");
  });
});

describe("교과평가 결과 읽기", () => {
  const row = (number: number, name: string, level: string) =>
    `${number}   ${name} 쓰기 과정을 점검 ⋅ 조정하며 글을 쓴다. 글을 고쳐 쓰고 공 유하기 ${level} 고쳐 쓰기 방법을 적용할 수 있다 . `;

  it("번호·성명·평가단계를 줄 단위로 읽는다", () => {
    const rows = parseAssessmentResultText(`${row(1, "김서윤", "잘함")}${row(2, "김채원", "보통")}`);
    expect(rows).toHaveLength(2);
    expect(rows[0].number).toBe(1);
    expect(rows[0].name).toBe("김서윤");
    expect(rows[1].name).toBe("김채원");
  });

  // 쪽이 넘어가면 한 줄이 여러 조각으로 쪼개지고 번호·성명이 다시 찍힌다.
  it("쪽 넘김으로 흩어진 조각을 번호로 다시 모은다", () => {
    const rows = parseAssessmentResultText(
      `${row(4, "박라미", "잘함")}4   박라미 쓰기 나 느낌을 구체적으로 나눌 수 있다 . ${row(5, "우혜원", "보통")}`,
    );
    expect(rows.map((item) => item.number)).toEqual([4, 5]);
    expect(rows[0].body).toContain("나 느낌을 구체적으로 나눌 수 있다");
  });

  // 한 학생 줄 안에 영역(쓰기·문법·매체)별 평가가 이어 붙어 나온다.
  it("한 줄에 들어 있는 영역별 평가를 단계 수만큼 나눈다", () => {
    const body =
      "쓰기 쓰기 과정을 점검하며 글을 쓴다. 글을 고쳐 쓰기 잘함 고쳐 쓸 수 있다. " +
      "문법 고유어와 관용 표현의 쓰임을 이해한다. 속담 찾아내기 보통 속담을 찾을 수 있다. " +
      "매체 복합양식 매체 자료를 제작하고 공유한다. 제작하기 노력요함 제작할 수 있다.";
    const blocks = splitEvaluationBlocks(body);
    expect(blocks.map((block) => block.level)).toEqual(["잘함", "보통", "노력요함"]);
    expect(blocks[1].segment).toContain("고유어와 관용 표현");
    // 각 토막은 자기 영역의 성취기준까지만 담아야 한다.
    expect(blocks[0].segment).not.toContain("고유어");
  });
});

describe("진입 선택 저장", () => {
  it("학교급과 학년이 짝이 맞을 때만 복원한다", () => {
    expect(isTeacherProfile({ schoolLevel: "elementary", grade: 6, role: "homeroom" })).toBe(true);
    expect(isTeacherProfile({ schoolLevel: "middle", grade: 3, role: "subject" })).toBe(true);
    // 중학교는 1~3학년뿐이라 6학년은 남은 옛 값으로 본다.
    expect(isTeacherProfile({ schoolLevel: "middle", grade: 6, role: "homeroom" })).toBe(false);
    expect(isTeacherProfile({ schoolLevel: "academy", grade: 1, role: "homeroom" })).toBe(false);
    expect(isTeacherProfile({ schoolLevel: "elementary", grade: 1, role: "principal" })).toBe(false);
    expect(isTeacherProfile({ schoolLevel: "elementary", grade: 1 })).toBe(false);
    expect(isTeacherProfile(null)).toBe(false);
  });
});
