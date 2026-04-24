# Exam Workbook Builder

로컬 Ollama + Obsidian vault 기반 **자격증 문제집 제작 파이프라인** Obsidian 플러그인.
교재 PDF를 OCR하고, 표준 포맷으로 구조화한 뒤, 개념 태깅과 **저작권 안전한 신규 문제 생성**까지 한 vault 안에서 처리합니다.

> 특정 자격증에 묶이지 않는 범용 프레임워크입니다. SQLD · 컴활 · 정보처리기사 · TOPIK 등 어떤 객관식 자격증에도 적용할 수 있도록 설계되었습니다.

## Pipeline (M1~M5)

1. **M1 · OCR** — `01_원본/` PDF를 페이지 PNG로 분할하고 Ollama vision 모델로 raw md 추출
2. **M2 · 구조화** — raw md를 `### Q{n}` / `#### 1)~4)` / `##### 정답:` / `###### 해설:` 표준 포맷으로 변환
3. **M3 · 개념 태깅** — `subject.yaml`의 개념 화이트리스트 기반으로 문제에 primary/secondary concept 부여
4. **M4 · 신규 생성** — 개념 조합 + `00_참고자료/`의 근거 자료 기반으로 원본 비재사용 문제 생성 (n-gram 중복 검사)
5. **M5 · 출력** — 회차별 모의고사 조립, 필요 시 hwpx/pptx로 내보내기

현재 버전 `0.5.0`에서 **M1~M5 전 파이프라인이 동작**합니다 (워크스페이스 초기화 · PDF import · 페이지/폴더 일괄 OCR · 구조화 · 개념 태깅 · 회차 생성 · 인쇄 export).

## 설치

### 요구사항
- Obsidian 1.5.0+
- Node.js 18+ (빌드용)
- [Ollama](https://ollama.com/) 로컬 실행 + 사용할 모델 pull
  ```bash
  ollama pull gemma3:4b      # vision (OCR)
  ollama pull mistral:7b     # 구조화
  ollama pull gemma2:9b      # 개념 태깅/문제 생성
  ```

### 빌드 & 배포
```bash
git clone https://github.com/leedonwoo2827-ship-it/exam-workbook-builder
cd exam-workbook-builder
npm install
npm run build
```

생성된 `main.js`, `manifest.json`, `styles.css` 세 파일을 Obsidian vault의
`<vault>/.obsidian/plugins/exam-workbook-builder/`에 복사한 뒤
설정 → 커뮤니티 플러그인에서 활성화.

## 명령어

`Ctrl+P` → `exam` 검색:

| 명령어 | 설명 | 추천 단축키 |
|--------|------|-------------|
| 자격증 워크스페이스 초기화 | cert 폴더 트리 + 시험개요·참고자료·subject.yaml 생성 | — |
| PDF 가져오기 (현재 활성 PDF) | vault 내부의 활성 PDF를 페이지 분할 | `Ctrl+Shift+I` |
| PDF 가져오기 (현재 워크스페이스에 페이지 분할) | 시스템 파일 선택창에서 PDF 고르기 | — |
| OCR 실행 (현재 페이지 이미지) | 활성 png 페이지 → Ollama vision → raw.md | `Ctrl+Shift+O` |
| 구조화 실행 (현재 raw.md) | `.raw.md` → mistral → 표준 `Q###.md` (검증 포함) | `Ctrl+Shift+S` |
| 개념 태깅 실행 (현재 Q.md) | `Q###.md` + `subject.yaml` → gemma2 → frontmatter `primary_concept`/`concepts` + 허브 노드 | `Ctrl+Shift+T` |
| 회차 생성 (현재 워크스페이스) | `subject.yaml` 분포 + `00_참고자료/` 팩 → gemma2로 N문제 생성 + 5-gram 저작권 검사 | — |
| 회차 export (활성 파일이 속한 회차) | `05_rounds/{roundId}/` → `06_output/{roundId}/printable.md` + 답안지 | `Ctrl+Shift+E` |
| Ollama 연결 확인 | `/api/tags` 확인, 설치 모델 목록 표시 | — |

## 탐색기 우클릭 메뉴

단일 파일·폴더 단위로 파이프라인을 돌릴 때 유용합니다 (문제가 1개씩 처리되는 흐름).

| 대상 | 메뉴 | 동작 |
|------|------|------|
| `.pdf` 파일 우클릭 | **Exam Workbook: PDF 가져오기** | 해당 PDF를 속한 cert 워크스페이스에 페이지 분할 |
| `.png` (pages/ 하위) 우클릭 | **Exam Workbook: 이 페이지 OCR** | 페이지 이미지 하나만 OCR 실행 |
| `01_원본/{sourceId}/` 또는 `pages/` 폴더 우클릭 | **Exam Workbook: 이 폴더의 페이지 일괄 OCR** | 폴더 내 모든 png 일괄 OCR (이미 raw가 있으면 스킵) |
| `.raw.md` 우클릭 | **Exam Workbook: 이 raw 구조화** | mistral로 표준 Q 포맷 변환 + 자동 검증 |
| `02_raw/{sourceId}/` 폴더 우클릭 | **Exam Workbook: 이 source 일괄 구조화** | 폴더 내 모든 `.raw.md` 일괄 처리 |
| `Q###.md` 우클릭 | **Exam Workbook: 이 문제 태깅** | gemma2로 개념 태그 부여 + 허브 노드 갱신 |
| `03_structured/{sourceId}/` 폴더 우클릭 | **Exam Workbook: 이 source 일괄 태깅** | 폴더 내 모든 `Q###.md` 일괄 (이미 태깅된 건 스킵) |
| cert 루트 폴더 우클릭 | **Exam Workbook: 이 워크스페이스에 PDF 가져오기** | 파일 선택창으로 PDF 고르기 |
| cert 루트 폴더 우클릭 | **Exam Workbook: 이 워크스페이스에 회차 생성** | 회차 ID·문제수·임계값 모달 |
| `05_rounds/{roundId}/` 폴더 우클릭 | **Exam Workbook: 이 회차 export** | 인쇄용 통합 markdown + 답안지 생성 |

cert 루트 판별은 해당 폴더 안에 `00_시험개요.md` / `subject.yaml` / `01_원본` / `05_rounds` 중 하나가 있는지로 자동 추정합니다.

## 사용법

### 1. 자격증 워크스페이스 초기화
명령어 팔레트 (`Ctrl+P`) → **자격증 워크스페이스 초기화** 실행 후:

| 입력 | 예시 |
|------|------|
| 상위 루트 폴더 | `exam-workbooks` (비워두면 vault 루트 바로 아래) |
| 자격증 코드 | `sqld`, `comp1`, `engineer` 등 (영문 소문자/숫자) |
| 자격증 한국어명 | `SQL 개발자` |
| 주관 기관 | `한국데이터산업진흥원` |
| 공식 홈페이지 | `https://www.dataq.or.kr/` |

생성되는 구조:
```
<root>/<cert>/
├── 00_시험개요.md
├── 00_참고자료/
│   ├── README.md
│   ├── 공식출제기준/
│   ├── 공식예시/
│   ├── 핵심개념정리/
│   ├── 함정오답패턴/
│   ├── 실무예제/
│   ├── 기출경향/
│   └── 용어사전/
├── 01_원본/
├── 02_raw/
├── 03_structured/
├── 04_concepts/
├── 05_rounds/
├── 06_output/
├── _cache/
├── _review/
└── subject.yaml
```

`subject.yaml`은 스켈레톤으로 생성되며, 해당 자격증의 공식 출제기준에 따라 `subjects[].topics[].concepts`를 채워 넣으세요.

### 2. PDF 가져오기
cert 워크스페이스 내부 파일을 **활성 상태로 둔 채** 명령어 팔레트 → **PDF 가져오기** 실행.
파일 선택 시 `01_원본/{YYMMDD}_{cert}_{slug}/pages/p0001.png ...`로 페이지별 PNG가 생성되고 `manifest.json`에 해시/쪽수가 기록됩니다.

- 렌더 배율은 설정 탭에서 조정 (기본 `2.0` ≈ 300dpi)
- `_cache/`는 중복 import 방지용 — 같은 해시 PDF는 재처리 시 스킵 가능

### 3. OCR 실행
`01_원본/.../pages/p0001.png` 같은 페이지 이미지를 연 상태에서 명령어 팔레트 → **OCR 실행**.
결과는 `02_raw/{sourceId}/p0001.raw.md`로 저장되며, 프롬프트는 `assets/prompts/02_ocr_vision.md` 기반입니다.

### 4. 구조화 실행 (M2)
`02_raw/{sourceId}/p0001.raw.md`를 활성 상태로 두고 명령어 팔레트 → **구조화 실행**.
구조화 모델(`mistral:7b`)이 raw 본문을 `### Q{n}` / `#### 1)~4)` / `##### 정답:` / `###### 해설:` 표준 포맷으로 변환하고,
한 페이지에서 추출된 각 문제는 `03_structured/{sourceId}/Q###.md`로 저장됩니다 (qid는 자동 채번).

자동 검증:
- 선택지 4개 / 정답 1~4 범위 / 해설 30자 이상 / 발문 비어있지 않음
- 검증 실패한 문제는 `_review/structure_errors.md`에 누적되어 수작업 보강 큐로 들어감
- 같은 페이지에 같은 발문(앞 30자 일치) 문제가 이미 있으면 기본 스킵 (멱등)

폴더 일괄: `02_raw/{sourceId}/` 폴더를 우클릭하면 그 폴더 내 모든 `.raw.md`를 순서대로 처리합니다.

### 5. 개념 태깅 (M3)
**선행 조건**: `subject.yaml`의 `subjects[].topics[].concepts`를 채워두어야 합니다.

`Q###.md`를 활성으로 두고 명령어 팔레트 → **개념 태깅 실행**.
- `gemma2:9b`가 화이트리스트 내에서 **1~3개 개념**을 선택하고 `primary_concept` + `concept_rationale`을 frontmatter에 추가
- 화이트리스트에 없는 개념은 `candidate:신규개념` 형태로 제안 (사람 승인 전 별도 폴더 `04_concepts/_candidates/`로)
- 각 개념마다 `04_concepts/{개념}.md` 허브 노드를 보장(없으면 템플릿 생성), `## 이 개념을 다루는 문제` 섹션에 `- [[Q###]]` 멱등 추가

폴더 일괄: `03_structured/{sourceId}/`를 우클릭하면 폴더 내 모든 `Q###.md`를 일괄 태깅합니다 (이미 `primary_concept` 있는 파일은 스킵).

### 6. 회차 생성 (M4)
**선행 조건**:
1. `subject.yaml`이 작성되어 있고 `subjects[].topics[].concepts`에 충분한 개념이 있음
2. `00_참고자료/` 아래에 카테고리별 R-*.md 노트가 일부라도 있음 (없어도 동작은 하나 결과 품질 ↓)
3. 원본 기출이 `03_structured/`에 쌓여 있으면 5-gram 저작권 검사가 의미를 가짐

명령어 팔레트 → **회차 생성** 또는 cert 루트 폴더 우클릭 → **이 워크스페이스에 회차 생성**.

모달 입력:
- 회차 ID (예: `2026-1회`) — 시드는 `{cert}_{roundId}`로 결정 → **재실행 시 같은 회차 구성 재현**
- 총 문제 수 (subject.yaml의 `round_distribution` 또는 과목 weight 비례로 자동 분배)
- 5-gram 겹침 임계 (기본 0.15) / 연속 일치 단어 한도 (기본 6) / 슬롯당 재시도 (기본 2)

생성 흐름:
1. 슬롯 플랜 — 과목·토픽·primary_concept·난이도 결정 (`stratified_sampling.max_tag_repeat` 적용)
2. 슬롯마다 관련 참고자료 상위 3건을 `generation_weight` 기준 선별 (`copyright_safe=false`는 본문 제외)
3. `gemma2:9b`에 [참고자료 팩 + 직전 5문제 발문 5-gram] 주입해 새 문제 생성
4. 검증(선택지 4개·정답·해설 길이) + 5-gram 겹침·연속 단어 검사 → 통과 시 저장, 실패 시 temperature↑로 재시도
5. 결과: `05_rounds/{roundId}/Q01.md ... Q{N}.md`, `index.md`, `answers.md`

### 7. 회차 export (M5)
회차 폴더(`05_rounds/{roundId}/`)를 우클릭하거나, 해당 폴더 내 어떤 파일이라도 활성으로 두고 **회차 export** 명령 실행.

산출:
- `06_output/{roundId}/printable.md` — 인쇄용 통합 markdown (각 문제 발문 + 선택지 ①②③④, 마지막에 답안표)
- `06_output/{roundId}/answers_with_explanations.md` — 정답·해설본 (학습용)

이 markdown들을 외부 도구로 변환:
- **HWPX**: `d:\mcp\hwpx_writer` (기존 사용자 도구) — 6단계 마크다운 헤딩이 한글 레벨 1~6에 매핑
- **PPTX**: `d:\mcp\pptx_writer` — 슬라이드 강의용
- **PDF**: Obsidian 자체 기능 → File → Export to PDF

### 8. Ollama 연결 확인
**Ollama 연결 확인** 명령으로 `GET /api/tags`를 호출해 설치된 모델 목록을 확인할 수 있습니다.

## 설정

| 항목 | 기본값 | 설명 |
|------|--------|------|
| Ollama URL | `http://localhost:11434` | |
| Vision 모델 | `gemma3:4b` | OCR |
| Structure 모델 | `mistral:7b` | 구조화 |
| Reasoning 모델 | `gemma2:9b` | 개념 태깅·신규 생성 |
| 기본 워크스페이스 루트 | (빈 값) | Init 모달 기본값 |
| PDF 렌더 배율 | `2.0` | 1.5 ≈ 200dpi, 2.0 ≈ 300dpi, 3.0 ≈ 450dpi |
| Import 최대 페이지 | `500` | |
| Ollama 타임아웃 | `180000` ms | |
| OCR 신뢰도 임계값 | `0.6` | 이하면 needs_review |

## 저작권 안전 원칙

- `00_참고자료/` 각 노트의 frontmatter에 `copyright_safe: true|false` 지정
- `false`인 자료는 생성 프롬프트에 **본문 배제, 핵심포인트·힌트만 주입**
- 생성 문제는 원본 대비 **연속 3어절 재사용 금지**, **5-gram 겹침 15% 초과 시 재생성** (M4에서 자동화)
- 공식 출제기준 요약·공공 NCS 자료는 `copyright_safe: true`, 상업 교재 발췌는 `false` 기본

## 로드맵

- [x] v0.1 — 워크스페이스 초기화, PDF import(페이지 분할), 페이지별 OCR
- [x] v0.1.1 — 탐색기 우클릭 메뉴 (PDF/PNG/cert 폴더), 활성 PDF 명령어
- [x] v0.1.2 — **M2 구조화** (mistral:7b) + 자동 검증 + raw/source 일괄 우클릭
- [x] v0.2.0 — **M3 개념 태깅** (gemma2:9b) + 허브 노드 자동 생성 + candidate 분리 + Q/source 일괄
- [x] v0.3.0 — **M4 신규 문제 생성** (gemma2:9b) + 분포 기반 슬롯 플랜 + 참고자료 팩 + 5-gram 저작권 검사
- [x] v0.4.0 — **M5 회차 export** (printable.md + answers_with_explanations.md, 외부 hwpx/pptx 변환 안내)
- [x] v0.5.0 — **배치 OCR** (`01_원본/{sourceId}/` 또는 `pages/` 폴더 우클릭, 기존 raw 자동 스킵)
- [ ] (옵션) Tesseract fallback — vision 신뢰도 < 임계 시 자동 전환
- [ ] v0.5 — M4 신규 문제 생성 + n-gram 중복 검사
- [ ] v0.6 — M5 회차 조립, hwpx/pptx 내보내기

## 폴더 구조 (이 레포)

```
exam-workbook-builder/
├── manifest.json              # 플러그인 메타
├── package.json
├── tsconfig.json
├── esbuild.config.mjs         # md를 text로 로드하는 설정 포함
├── styles.css
├── versions.json
├── LICENSE                    # MIT
├── assets/
│   ├── prompts/               # 번들 시 embedded.ts에 인라인
│   │   ├── 02_ocr_vision.md
│   │   ├── 03_structure.md
│   │   ├── 04_concept_tag.md
│   │   └── 05_generate.md
│   └── templates/
│       ├── exam_overview.md
│       ├── reference_note.md
│       ├── question.md
│       ├── concept.md
│       └── roundset.md
└── src/
    ├── main.ts                # 플러그인 진입점
    ├── settings.ts
    ├── ollama.ts              # /api/tags, /api/generate (images 지원)
    ├── embedded.ts
    ├── types.ts
    ├── utils.ts
    ├── modules.d.ts           # *.md 타입 선언
    ├── commands/
    │   ├── initWorkspace.ts
    │   ├── importPdf.ts
    │   ├── ocrPage.ts
    │   ├── ocrFolder.ts       # v0.5: 01_원본/{sourceId}/ 또는 pages/ 일괄 OCR
    │   ├── structureRaw.ts    # M2: 단일 raw → Q###.md
    │   ├── structureSource.ts # M2: source 폴더 일괄
    │   ├── tagQuestion.ts     # M3: 단일 Q 개념 태깅
    │   ├── tagSource.ts       # M3: 03_structured/{sourceId} 일괄
    │   ├── generateRound.ts   # M4: 회차 생성 (모달 + 파이프라인)
    │   └── exportRound.ts     # M5: 인쇄용 markdown export
    ├── structure/
    │   ├── parseRaw.ts        # raw.md frontmatter/본문 파싱
    │   ├── parseModel.ts      # mistral 응답 → ParsedQuestion[]
    │   └── validate.ts        # 선택지/정답/해설 검증
    ├── concepts/
    │   ├── parseSubjectYaml.ts  # subject.yaml → SubjectConfig
    │   ├── parseTagResponse.ts  # gemma2 JSON → concepts/primary
    │   ├── frontmatter.ts       # frontmatter split/merge/join
    │   └── conceptHub.ts        # 04_concepts/{개념}.md 허브 upsert
    └── round/
        ├── seedRandom.ts        # 결정적 시드 → mulberry32 PRNG
        ├── sampler.ts           # 분포 기반 슬롯 플랜 (stratified)
        ├── referencePicker.ts   # 00_참고자료 로딩·팩 선별
        └── copyrightCheck.ts    # 5-gram 겹침 + 연속 단어 일치
```

## 기여

이슈/PR 환영합니다. 특히:
- 특정 자격증 `subject.yaml` 샘플 (공개 출제기준 기반)
- 참고자료 노트 양식 개선
- M2~M5 단계 구현

## License

MIT © 2026 leedonwoo
