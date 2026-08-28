import { describe, expect, it } from "vitest";
import report from "@/data/curriculum-report.json";
import {
  areasFor,
  defaultSelectionFor,
  gradeBandFor,
  hasCurriculumFor,
  officialLevelFor,
  schoolLevelsFor,
  standards,
  standardsFor,
  subjectsFor,
} from "@/lib/curriculum";
import { gradesFor } from "@/lib/school";
import { anonymizeText } from "@/lib/privacy";
import { parseRoster } from "@/lib/roster";
import { createPerformanceDraft, particleFor, createBehaviorSentence, createGroundedSentence, createUniqueGroundedSentence, escapeSpreadsheetCell, hasAwkwardBehaviorMeta, hasAwkwardSubjectPattern, isSubjectSentenceTooSimilar, ngramSimilarity, utf8Bytes } from "@/lib/text";
import { analyzeAssessmentPlan, parseAssessmentResultText, parseExtractedText, parsePerformanceGrid, splitEvaluationBlocks } from "@/lib/files";
import { isTeacherProfile } from "@/lib/storage";
import { standardsFromPlanRows } from "@/features/assessment-plan";
import { buildUploadedStandard } from "@/lib/curriculum";

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

describe("학교급별 학년·과목", () => {
  it("초등은 1~6학년, 중·고등은 1~3학년만 고를 수 있다", () => {
    expect(gradesFor("elementary")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(gradesFor("middle")).toEqual([1, 2, 3]);
    expect(gradesFor("high")).toEqual([1, 2, 3]);
  });

  it("초등만 학년군을 갖고 중·고등은 초등 학년군으로 흘러가지 않는다", () => {
    expect(hasCurriculumFor("elementary")).toBe(true);
    expect(gradeBandFor("elementary", 1)).toBe("1-2");
    expect(gradeBandFor("elementary", 3)).toBe("3-4");
    expect(gradeBandFor("elementary", 6)).toBe("5-6");
    for (const schoolLevel of ["middle", "high"] as const) {
      expect(hasCurriculumFor(schoolLevel)).toBe(false);
      expect(gradesFor(schoolLevel).map((grade) => gradeBandFor(schoolLevel, grade))).toEqual([
        null,
        null,
        null,
      ]);
    }
  });

  it("학년군이 없으면 과목·평가영역·성취기준을 하나도 내주지 않는다", () => {
    expect(subjectsFor(null)).toEqual([]);
    expect(areasFor(null, "국어")).toEqual([]);
    expect(standardsFor(null, "국어", "듣기·말하기")).toEqual([]);
  });

  it("작업 화면 기본 선택이 학교급을 따라간다", () => {
    expect(defaultSelectionFor("elementary", 3)).toEqual({
      grade: 3,
      subject: "국어",
      area: "듣기·말하기",
    });
    expect(defaultSelectionFor("middle", 1)).toEqual({ grade: 1, subject: "", area: "" });
    expect(defaultSelectionFor("high", 3)).toEqual({ grade: 3, subject: "", area: "" });
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

describe("수행평가 세특", () => {
  const grid = [
    ["번호", "이름", "희망 진로/전공", "선택 알고리즘", "① 개념 및 원리", "② 한계 및 비판"],
    ["1반 3번", "김하늘", "희망 진로: 미생물학자", "패턴 인식", "특징을 추출해 분류하는 알고리즘이다.", "데이터가 편향될 수 있다."],
    ["1반 4번", "이바다", "-", "공개 키 암호화", "키를 나누어 쓰는 방식이다.", "작성하지 않았습니다."],
  ];

  it("번호와 항목만 읽고 이름 칸은 담지 않는다", () => {
    const rows = parsePerformanceGrid(grid);
    expect(rows.map((row) => row.number)).toEqual([3, 4]);
    expect(JSON.stringify(rows)).not.toContain("김하늘");
    expect(rows[0].aspects.map((aspect) => aspect.label)).toEqual(["개념 및 원리", "한계 및 비판"]);
    expect(rows[0].topic).toBe("패턴 인식");
  });

  it("학생이 쓴 내용만으로 명사형 세특 초안을 만든다", () => {
    const [first] = parsePerformanceGrid(grid);
    const draft = createPerformanceDraft(first);
    expect(draft).toContain("'패턴 인식'을 주제로");
    // 평서형 종결이 남으면 안 된다.
    expect(draft).toContain("분류하는 알고리즘임");
    expect(draft).not.toContain("알고리즘이다");
    expect(draft).toContain("개념 및 원리를 정리함");
    expect(draft).toContain("한계 및 비판을 짚어냄");
    expect(draft).toContain("미생물학자");
    // 진로 칸의 "희망 진로:" 접두사는 걷어낸다.
    expect(draft).not.toContain("희망 진로: 미생물학자");
  });

  it("미작성 항목과 진로 없음(-)은 문장에 넣지 않는다", () => {
    const draft = createPerformanceDraft(parsePerformanceGrid(grid)[1]);
    expect(draft).not.toContain("작성하지 않았습니다");
    expect(draft).not.toContain("한계 및 비판");
    expect(draft).not.toContain("희망 진로인");
  });

  it("받침에 따라 을/를을 가려 쓴다", () => {
    expect(particleFor("원리", "을", "를")).toBe("를");
    expect(particleFor("영향", "을", "를")).toBe("을");
    // 괄호로 끝나도 마지막 한글을 기준으로 삼는다.
    expect(particleFor("기술의 진화(AI 융합)", "을", "를")).toBe("을");
  });
});

describe("수행평가 세특 다시 생성", () => {
  const row = {
    number: 1,
    career: "미생물학자",
    topic: "패턴 인식",
    aspects: [
      {
        label: "개념 및 원리",
        text: "특징을 추출해 분류하는 알고리즘이다. 원시데이터에서 특징을 뽑아 학습한다. 학습한 모델을 일반화한다.",
      },
    ],
  };

  it("변형을 올리면 서로 다른 초안이 나온다", () => {
    const drafts = [0, 1, 2].map((variant) => createPerformanceDraft(row, { variant }));
    expect(new Set(drafts).size).toBe(3);
    // 무엇을 바꾸든 학생이 쓴 내용 안에서만 골라야 한다.
    drafts.forEach((draft) => {
      expect(draft).toContain("패턴 인식");
      expect(draft).toMatch(/알고리즘임|특징을 뽑아 학습함|일반화함/u);
    });
  });

  it("변형이 같으면 같은 초안을 낸다", () => {
    expect(createPerformanceDraft(row, { variant: 2 })).toBe(
      createPerformanceDraft(row, { variant: 2 }),
    );
  });
});

describe("중·고등 업로드 평가계획", () => {
  const middleCsv =
    "과목,평가영역,성취기준\n" +
    '과학,물질의 구성,"9과03-02 물질을 구성하는 입자의 운동을 설명한다."';

  it("공식 자료에 없는 코드도 올린 문구로 성취기준을 만든다", async () => {
    const file = new File([middleCsv], "중2-과학.csv", { type: "text/csv" });
    const rows = await analyzeAssessmentPlan(file, standards);
    // 초등 데이터에 없으므로 공식 매칭은 실패한다.
    expect(rows[0].officialStandardCode).toBe("");
    // 그래도 올린 문구로 평가표를 쓸 수 있어야 한다.
    const built = standardsFromPlanRows(rows, { allowUploaded: true });
    expect(built).toHaveLength(1);
    expect(built[0].uploaded).toBe(true);
    expect(built[0].standardText).toContain("입자의 운동");
    expect(built[0].subjectName).toBe("과학");
    // 세 수준이 모두 채워져야 평어를 만들 수 있다.
    expect(built[0].levelA).toBeTruthy();
    expect(built[0].levelB).toBeTruthy();
    expect(built[0].levelC).toBeTruthy();
  });

  it("허용하지 않으면 예전처럼 공식 기준만 남는다", async () => {
    const file = new File([middleCsv], "중2-과학.csv", { type: "text/csv" });
    const rows = await analyzeAssessmentPlan(file, standards);
    expect(standardsFromPlanRows(rows)).toHaveLength(0);
  });

  it("올린 기준으로도 평가단계별 평어를 만든다", async () => {
    const file = new File([middleCsv], "중2-과학.csv", { type: "text/csv" });
    const [standard] = standardsFromPlanRows(
      await analyzeAssessmentPlan(file, standards),
      { allowUploaded: true },
    );
    const sentence = createGroundedSentence({
      standard,
      officialLevel: "A",
      schoolLevel: "잘함",
      seed: 0,
    });
    expect(sentence).toContain("입자의 운동");
    expect(sentence.endsWith(".")).toBe(true);
  });
});

describe("업로드 기준 문장 다듬기", () => {
  const build = (text: string) =>
    buildUploadedStandard({
      standardCode: "",
      standardText: text,
      subject: "과학",
      area: "물질",
      gradeBand: "5-6",
    });

  it("문장 앞의 성취기준 코드를 떼어낸다", () => {
    expect(build("9과03-02 물질의 입자 운동을 설명한다.").standardText).toBe(
      "물질의 입자 운동을 설명한다.",
    );
  });

  it("평서형을 성취수준 꼴로 바꾼다", () => {
    // 설명한다 → 설명할 수 있다 (받침 ㄴ→ㄹ)
    expect(build("입자 운동을 설명한다.").levelB).toContain("설명할 수 있다");
    expect(build("입자 운동을 설명한다.").levelB).not.toContain("설명한 수");
    // 이미 "~할 수 있다"면 그대로 둔다.
    expect(build("자기장을 그릴 수 있다.").levelA).toContain("그릴 수 있다");
  });
});
