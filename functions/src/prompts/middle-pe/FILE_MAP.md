# 파일명 대조표 — `middle-pe` (중학교 체육·예술)

`elementary/FILE_MAP.md`와 같은 형식임. 윈도우에서 한글 파일명이 깨지는 문제를 피하려고 파일명을 영문으로 지었고, 파일 **내용은 모두 한글**임.

## 1. 원본 출처

이 팩은 아래 두 텍스트 파일을 재구성한 것임.

| 원본 파일 | 재구성 결과 |
|---|---|
| `중학_지침.txt` — 공통 지침 §1~§7 | `_shared/00_common.md` (`high-info`와 공유. 초등·중학·고등 지침 파일의 공통 블록이 완전히 동일하여 1부로 통합) |
| `중학_지침.txt` — 추가 지침(중학교) | `middle-pe/00_core_prompt.md` §2 |
| `중학_지침.txt` — 추가 지침(체육·예술 교과) | `middle-pe/00_core_prompt.md` §3 |
| `중학_지침.txt` — 작성 예시(체육 영역별) | `middle-pe/examples/M1-3_pe_*.md`에 성취도별로 흡수 |
| `중학_지침.txt` — 작성 예시(행동특성 및 종합의견) | `middle-pe/examples/M1-3_behavior.md` |
| `중학_지침.txt` — 예시에서 확인할 수 있는 패턴 | `middle-pe/00_core_prompt.md` §6·§7 및 각 예시 파일 말미 |
| `체육_예시은행.txt` — 4개 영역 × 성취도 3단계 | `middle-pe/examples/M1-3_pe_*.md` 4개 파일 |

## 2. 파일명 대조표

| 한글 이름 | 이 패키지의 파일명 |
|---|---|
| 00_코어_프롬프트.md | 00_core_prompt.md |
| FILE_MAP_파일명대조표.md | FILE_MAP.md |
| examples/중1-3_체육_건강(체력)_수준별.md | examples/M1-3_pe_health_by-level.md |
| examples/중1-3_체육_도전(육상·기계체조)_수준별.md | examples/M1-3_pe_challenge_by-level.md |
| examples/중1-3_체육_경쟁(구기)_수준별.md | examples/M1-3_pe_competition_by-level.md |
| examples/중1-3_체육_표현(무용·리듬)_수준별.md | examples/M1-3_pe_expression_by-level.md |
| examples/중1-3_행동특성및종합의견.md | examples/M1-3_behavior.md |

명명 규칙은 `elementary`와 같음. `{학년군}_{교과영문}_{영역}_{변형}.md` 형태이며, 중학교는 1~3학년 공통이므로 학년군 접두를 `M1-3`으로 씀. `by-level` 접미는 성취도(상·중·하) 대조형이라는 뜻으로 `elementary`와 동일하게 사용함.

교과 영문 키: `pe` 체육, `music` 음악, `art` 미술.

## 3. `data/` 폴더가 없는 이유

중학교 체육의 성취기준·성취수준 데이터가 제공되지 않아 `data/` 계층을 만들지 않았음. `elementary`도 같은 이유(요청 본문으로 전달됨)로 이 저장소에는 `data/`가 없으므로, 현재 두 팩 모두 성취기준 원문은 호출 요청 본문에서 받음.

중학교 체육 성취기준 데이터가 확보되면 `elementary`의 스키마(`elementary/README.md` §3)를 그대로 따라 `middle-pe/data/by-subject/M1-3_pe.json`으로 추가하고, `../index.ts`의 팩 정의에 `data` 경로를 넣으면 됨.

## 4. 아직 채워지지 않은 범위

- **음악·미술 예시집** — 이 팩은 체육·예술 교과 공통 요건(실기능력·교과적성 포함)을 다루지만 예시집은 체육만 있음. 음악·미술로 호출되면 코어 프롬프트만 주입되고 예시는 생략됨. 확보되면 `M1-3_music_*.md`, `M1-3_art_*.md`로 추가할 것
- **중학교 체육 성취기준 데이터** — §3 참고
- **2022 개정 영역명 기준 예시** — 현재 예시집은 2015 개정 영역명(건강·도전·경쟁·표현)으로 정리되어 있음. 대응 관계는 `00_core_prompt.md` §3.3에 있음
