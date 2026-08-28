export interface TutorialStep {
  emoji: string;
  title: string;
  body: string;
}

export const tutorialSteps: TutorialStep[] = [
  {
    emoji: "👋",
    title: "반가워요",
    body: "평행톡톡은 2022 개정 교육과정에 근거한 교과평어와 행발 초안을 안전하게 만드는 도구예요.",
  },
  {
    emoji: "📚",
    title: "평어 만들기",
    body: "학년·과목·영역·성취기준과 평가단계를 고르면 공식 A·B·C 수준에 맞춰 초안을 만들어요.",
  },
  {
    emoji: "🌱",
    title: "행발 만들기",
    body: "관찰 키워드와 실제로 본 특징만 입력하세요. 입력하지 않은 역할이나 성취는 만들지 않아요.",
  },
  {
    emoji: "🔎",
    title: "근거 기반 초안 확인",
    body: "공식 근거와 중복 여부를 확인하고 직접 수정한 뒤 ‘확인 완료’에 체크해 주세요.",
  },
  {
    emoji: "☁️",
    title: "저장하고 이어쓰기",
    body: "Google 로그인 후 저장하면 어느 기기에서든 이어 쓸 수 있어요. 입력 중 내용은 기기에도 임시 저장돼요.",
  },
  {
    emoji: "🛡️",
    title: "개인정보 보호",
    body: "학생 실명은 기본적으로 이 기기에만 보관하며 외부 AI에는 보내지 않아요. 화면에서 이름을 즉시 가릴 수도 있어요.",
  },
];
