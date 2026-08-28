# 배포 가이드

`<PROJECT_ID>` 는 본인의 Firebase 프로젝트 ID로 바꿔 읽으세요.

## 1. Firebase 프로젝트 준비

1. [Firebase Console](https://console.firebase.google.com/) 에서 프로젝트 생성
2. **빌드 → Authentication → Sign-in method → Google** 사용 설정
3. **Authentication → 설정 → 승인된 도메인** 에 배포 도메인 추가
   (`<PROJECT_ID>.web.app`, `<PROJECT_ID>.firebaseapp.com`, 커스텀 도메인)
4. **Firestore Database** 생성 (프로덕션 모드)
5. 프로젝트 설정 → 일반 → **내 앱 → 웹 앱 추가** 후 표시되는 설정값을 복사

## 2. 로컬 설정

```bash
cp .env.example .env.local          # 위에서 복사한 웹 설정값 입력
cp .firebaserc.example .firebaserc   # "default" 를 <PROJECT_ID> 로 수정
npm install
npx firebase login
```

## 3. 프런트엔드 배포 (Firebase Hosting)

```bash
npm run deploy        # next build → out/ 생성 → firebase deploy --only hosting
```

미리보기 채널로 먼저 확인하려면:

```bash
npm run build
npx firebase hosting:channel:deploy preview
```

## 4. 백엔드 배포 (선택 — AI 생성 기능)

Cloud Functions 는 Blaze(종량제) 요금제가 필요합니다.

```bash
# Upstage(Solar) API 키를 시크릿으로 등록 (https://console.upstage.ai 에서 발급)
npx firebase functions:secrets:set UPSTAGE_API_KEY

# (선택) 사용할 모델 지정 — 기본값은 solar-pro2
#   firebase functions:config 대신 런타임 env 로 UPSTAGE_MODEL=solar-pro4 등 설정 가능

npm --prefix functions install
npm --prefix functions run build
npm run deploy:backend        # functions + firestore rules/indexes + storage rules
```

배포 후 `.env.local` 에서 `NEXT_PUBLIC_ENABLE_CLOUD_AI=true` 로 바꾸고 다시 `npm run deploy`.

App Check(reCAPTCHA Enterprise)를 쓰는 경우 사이트 키를
`NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` 에 넣고 Console에서 Functions에 대한 적용을
설정합니다.

## 5. 보안 규칙만 다시 배포

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```
