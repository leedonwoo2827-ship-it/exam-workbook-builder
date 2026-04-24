# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 기반.

## [1.0.1] — 2026-04-25

### 변경
- `scripts/check-cert-urls.mjs` 견고성 보강:
  - User-Agent를 표준 Chrome으로 변경 (정부·기관 사이트의 봇 차단 회피)
  - Accept-Language / Accept-Encoding 헤더 추가
  - GET → HEAD 순으로 시도 (HEAD를 막는 사이트 대응)
  - 타임아웃 12s → 15s
  - `EXPECTED_FAILS` 화이트리스트 도입 — CI에서 일관되게 차단되는 URL은 warning만 발생, exit 0 유지

## [1.0.0] — 2026-04-25

첫 안정 릴리즈. M1~M5 전 파이프라인 동작 + 진단·검증 도구 + 카탈로그 자동 검증.

### 추가
- BRAT(Beta Reviewer's Auto-update Tool) 호환 매니페스트 — 베타 채널을 통해 Obsidian 사용자들이 손쉽게 설치 가능
- README에 설치 경로(BRAT / 수동 / 빌드) 정리

### 변경
- 안정 채널 진입에 따라 manifest version 1.0.0, versions.json 동기화

## [0.7.0] — 2026-04-25

### 추가
- `scripts/check-cert-urls.mjs` — `docs/SUPPORTED_CERTS.md`의 모든 공식 URL 도달 가능 여부 자동 검증
- `npm run check:catalog` 스크립트
- `.github/workflows/check-cert-urls.yml` — 매주 월요일 02:00 UTC 자동 실행

## [0.6.0] — 2026-04-25

### 추가
- **워크스페이스 진단** — cert별 단계별 통계 + 다음 단계 추천 (`_review/workspace_status.md`)
- **subject.yaml 검증** — 필수 필드·중복·분포 검사 (`_review/subject_yaml_check.md`)
- **회차 검증 리포트** — 과목·난이도·개념 분포 + 저작권 통과율 (`06_output/{roundId}/audit.md`)
- 우클릭 메뉴 3종 추가 (cert root / subject.yaml / 회차 폴더)

## [0.5.0] — 2026-04-25

### 추가
- **배치 OCR** — `01_원본/{sourceId}/` 또는 `pages/` 폴더 우클릭으로 모든 페이지 일괄 OCR
- 기존 `02_raw/{sourceId}/{name}.raw.md`가 있으면 자동 스킵 (재실행 안전)

## [0.4.0] — 2026-04-25

### 추가
- **M5 회차 export** — `05_rounds/{roundId}/` → `06_output/{roundId}/printable.md` + `answers_with_explanations.md`
- 회차 폴더 우클릭 메뉴 + 활성 파일 기반 명령어
- README에 hwpx_writer / pptx_writer / Obsidian PDF export 핸드오프 안내

## [0.3.0] — 2026-04-25

### 추가
- **M4 신규 문제 생성** (`gemma2:9b`)
- 결정적 시드(`{cert}_{roundId}`) 기반 stratified sampling — 같은 회차 ID는 같은 슬롯 플랜 재현
- 참고자료 팩 — `00_참고자료/`의 `R-*.md`를 `related_concepts` 매칭 + `generation_weight` 정렬, `copyright_safe=false`는 본문 제외
- 5-gram 겹침 + 연속 단어 일치 임계 검사 → 실패 시 temperature 상향 후 재시도
- 회차 모달(회차 ID·문제수·임계값·재시도 횟수) + cert 루트 폴더 우클릭

## [0.2.0] — 2026-04-25

### 추가
- **M3 개념 태깅** (`gemma2:9b`)
- `subject.yaml` 화이트리스트 기반 1~3개 개념 부여, 화이트리스트 외는 `candidate:` 접두어로 분리
- `04_concepts/{개념}.md` 허브 노드 자동 생성 + `## 이 개념을 다루는 문제` 섹션에 `- [[Q###]]` 멱등 추가
- candidate 개념은 `04_concepts/_candidates/`로 격리 (사람 승인 전)
- Q.md / 03_structured 폴더 우클릭 메뉴

### 변경
- `ollama.ts`에 `format: "json"` 옵션 (구조화된 응답 강제)

## [0.1.2] — 2026-04-25

### 추가
- **M2 구조화** (`mistral:7b`)
- raw.md → 표준 `Q###.md` (qid 자동 채번, 멱등성, `_review/structure_errors.md` 큐)
- 자동 검증: 선택지 4개 / 정답 1~4 범위 / 해설 30자 이상

## [0.1.1] — 2026-04-24

### 추가
- 탐색기 우클릭 컨텍스트 메뉴 3종 (`.pdf` / `.png` / cert 루트 폴더)
- "PDF 가져오기 (현재 활성 PDF)" 명령어

## [0.1.0] — 2026-04-24

### 추가
- 첫 공개 — Obsidian 플러그인 골격 + 4개 명령어
- 자격증 워크스페이스 초기화
- PDF 가져오기 (`pdfjs-dist`로 페이지별 PNG 분할)
- OCR 실행 (Ollama vision API, base64 이미지 입력)
- Ollama 연결 확인
- 설정 탭 (URL · 3-tier 모델 · 렌더 배율 · 타임아웃 등)
