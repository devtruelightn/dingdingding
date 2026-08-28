# 함께 개발하기

## 브랜치 & 커밋

- 기본 브랜치: `main` (직접 push 금지, PR로 병합)
- 작업 브랜치: `feature/<요약>`, `fix/<요약>`, `chore/<요약>`
- 커밋 메시지: [Conventional Commits](https://www.conventionalcommits.org/) 권장
  - 예: `feat(behavior): 학생별 임시저장 추가`, `fix(files): HWPX 빈 XML 처리`

## PR 체크리스트

병합 전 아래가 모두 통과해야 합니다.

```bash
npm run lint
npm run typecheck
npm test
```

UI 변경 시 `npm run dev` 로 미리보기 모드(로그인 없이)에서 동작을 확인하고,
가능하면 스크린샷을 첨부하세요.

## 로컬에서 전체 스택 실행 (배포 없이)

로그인 · Firestore · AI(Cloud Functions)까지 로컬에서 확인하려면 Firebase 에뮬레이터를 씁니다.
운영 프로젝트에 **배포하지 않고** 내 컴퓨터에서만 돕니다.

```bash
# 1. 최초 1회
cp .env.example .env.local                 # Firebase 웹 설정값 입력
cp functions/.env.example functions/.env.local   # UPSTAGE_API_KEY 입력
npm install && npm --prefix functions install

# 2. .env.local 에서 아래를 켠다
#    NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# 3. 실행 (에뮬레이터 + next dev 동시 기동, Ctrl+C 로 종료)
npm run dev:local
```

- 앱: http://localhost:3000 · 에뮬레이터 UI: http://localhost:4000
- 에뮬레이터는 Auth(9099) / Firestore(8080) / Functions(5001) / Storage(9199) 를 띄웁니다.
- 에뮬레이터 Auth 에서는 실제 Google 계정 대신 UI 에서 테스트 계정을 만들어 로그인합니다.
- `npm run emulators` 만 따로 실행하고 다른 터미널에서 `npm run dev` 를 돌려도 됩니다.
- 배포는 관리자만 `main` 병합 후 진행합니다. 작업자는 배포 명령(`npm run deploy*`)을 쓰지 않습니다.

## 새 기능은 어디에 추가하나요?

`src/features/<기능이름>/` 폴더를 만들고 그 안에서 완결합니다.

```
src/features/my-feature/
  MyFeature.tsx        # 화면 컴포넌트 ("use client")
  components/           # 이 기능에서만 쓰는 하위 컴포넌트
  hooks/               # 이 기능 전용 훅
  index.ts             # 외부 공개 진입점
```

- 여러 기능이 공유하는 UI → `src/components/ui`
- UI 없는 순수 로직(파싱·계산·Firebase 호출) → `src/lib/<도메인>`
- 공용 타입 → `src/types`
- 경로 별칭 `@/` 는 `src/` 를 가리킵니다. 상대경로 대신 `@/lib/...` 를 쓰세요.

## 스타일

- Tailwind 유틸리티 클래스 사용. 색상은 `bg-primary`, `text-muted`, `border-line` 등
  `src/app/globals.css` 의 `@theme` 토큰을 참조합니다 (테마 8종 자동 대응).
- 반복되는 조합은 `src/components/ui` 컴포넌트로 추출합니다.
- 조건부 클래스는 `cn()`(`src/lib/cn.ts`) 유틸을 사용합니다.

## 개인정보 원칙

- 학생 실명은 IndexedDB(`src/lib/local-db.ts`)에만 저장하고 외부로 보내지 않습니다.
- AI(Cloud Functions) 호출 전 관찰 메모는 `src/lib/privacy.ts` 로 익명화합니다.
- 새 데이터를 Firestore에 쓰려면 `firestore.rules` 도 함께 갱신하고
  `npm run test:rules` 로 검증합니다.
