# 파일명 대조표 — `high-info` (고등학교 정보)

`elementary/FILE_MAP.md`와 같은 형식임. 윈도우에서 한글 파일명이 깨지는 문제를 피하려고 파일명을 영문으로 지었고, 파일 **내용은 모두 한글**임.

## 1. 원본 출처

이 팩은 아래 두 텍스트 파일을 재구성한 것임.

| 원본 파일 | 재구성 결과 |
|---|---|
| `고등_지침.txt` — 공통 지침 §1~§7 | `_shared/00_common.md` (`middle-pe`와 공유. 초등·중학·고등 지침 파일의 공통 블록이 완전히 동일하여 1부로 통합) |
| `고등_지침.txt` — 추가 지침(고등학교) | `high-info/00_core_prompt.md` §2 |
| `고등_지침.txt` — 추가 지침(정보 교과) | `high-info/00_core_prompt.md` §3 |
| `고등_지침.txt` — 작성 예시(정보 영역별) | `high-info/examples/H_info_*.md`에 성취도별로 흡수 |
| `고등_지침.txt` — 예시에서 확인할 수 있는 패턴 | `high-info/00_core_prompt.md` §4·§6·§7 및 각 예시 파일 말미 |
| `정보_예시은행.txt` — 5개 영역 × 성취도 3단계 | `high-info/examples/H_info_*.md` 5개 파일 |

## 2. 파일명 대조표

| 한글 이름 | 이 패키지의 파일명 |
|---|---|
| 00_코어_프롬프트.md | 00_core_prompt.md |
| FILE_MAP_파일명대조표.md | FILE_MAP.md |
| examples/고_정보_컴퓨팅시스템_수준별.md | examples/H_info_computing-system_by-level.md |
| examples/고_정보_데이터_수준별.md | examples/H_info_data_by-level.md |
| examples/고_정보_알고리즘과프로그래밍_수준별.md | examples/H_info_algorithm_by-level.md |
| examples/고_정보_인공지능_수준별.md | examples/H_info_ai_by-level.md |
| examples/고_정보_디지털문화(정보윤리)_수준별.md | examples/H_info_digital-culture_by-level.md |

명명 규칙은 `elementary`와 같음. `{학년군}_{교과영문}_{영역}_{변형}.md` 형태이며, 고등학교 「정보」는 학년 구분 없이 편성되므로 학년군 접두를 `H`로 씀. `by-level` 접미는 성취도(상·중·하) 대조형이라는 뜻으로 `elementary`와 동일하게 사용함.

교과 영문 키: `info` 정보.

## 3. `data/` 폴더가 없는 이유

고등학교 정보 교과의 성취기준·성취수준 데이터가 제공되지 않아 `data/` 계층을 만들지 않았음. `elementary`도 같은 이유(요청 본문으로 전달됨)로 이 저장소에는 `data/`가 없으므로, 현재 세 팩 모두 성취기준 원문은 호출 요청 본문에서 받음.

정보 교과 성취기준 데이터가 확보되면 `elementary`의 스키마(`elementary/README.md` §3)를 그대로 따라 `high-info/data/by-subject/H_info.json`으로 추가하고, `../index.ts`의 팩 정의에 `data` 경로를 넣으면 됨.

## 4. 아직 채워지지 않은 범위

- **행동특성 및 종합의견 예시** — `고등_지침.txt`와 `정보_예시은행.txt` 모두 고등학교 행발 예시를 담고 있지 않음. 고등학교 행발로 호출되면 코어 프롬프트만 주입되고 예시는 생략됨. 참고 형식이 필요하면 `middle-pe/examples/M1-3_behavior.md`가 같은 900Byte 기준이므로 유사하게 활용할 수 있음
- **특성화고·마이스터고 전문교과 전공실무 과목** — NCS 능력단위 기준으로 구조가 전혀 달라 이 팩의 대상이 아님. 별도 팩(가칭 `high-info-nsc`)이 필요함. `00_core_prompt.md` §3.2 참고
- **정보 교과 성취기준 데이터** — §3 참고
