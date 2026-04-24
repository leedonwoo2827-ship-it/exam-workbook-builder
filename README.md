# Exam Workbook Builder

로컬 Ollama + Obsidian vault 기반 **자격증 문제집 제작 파이프라인** Obsidian 플러그인.
교재 PDF를 OCR하고, 표준 포맷으로 구조화한 뒤, 개념 태깅과 **저작권 안전한 신규 문제 생성**까지 한 vault 안에서 처리합니다.

> 특정 자격증에 묶이지 않는 범용 프레임워크입니다. SQLD · 컴활 · 정보처리기사 등 어떤 객관식 자격증에도 적용할 수 있도록 설계되었습니다.

## Pipeline (M1~M5)

1. **M1 · OCR** — `01_원본/` PDF를 페이지 PNG로 분할하고 Ollama vision 모델로 raw md 추출
2. **M2 · 구조화** — raw md를 `### Q{n}` / `#### 1)~4)` / `##### 정답:` / `###### 해설:` 표준 포맷으로 변환
3. **M3 · 개념 태깅** — `subject.yaml`의 개념 화이트리스트 기반으로 문제에 primary/secondary concept 부여
4. **M4 · 신규 생성** — 개념 조합 + `00_참고자료/`의 근거 자료 기반으로 원본 비재사용 문제 생성 (n-gram 중복 검사)
5. **M5 · 출력** — 회차별 모의고사 조립, 필요 시 hwpx/pptx로 내보내기

현재 버전 `0.1.0`은 **M1의 핵심 단계**(워크스페이스 초기화 · PDF import · 페이지별 OCR)를 제공합니다. M2~M5는 로드맵 참조.

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

### 4. Ollama 연결 확인
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
- [ ] v0.2 — 배치 OCR (디렉토리 단위), Tesseract fallback
- [ ] v0.3 — M2 구조화 (mistral:7b) + 자동 검증
- [ ] v0.4 — M3 개념 태깅 + 개념 허브 자동 생성
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
    └── commands/
        ├── initWorkspace.ts
        ├── importPdf.ts
        └── ocrPage.ts
```

## 기여

이슈/PR 환영합니다. 특히:
- 특정 자격증 `subject.yaml` 샘플 (공개 출제기준 기반)
- 참고자료 노트 양식 개선
- M2~M5 단계 구현

## License

MIT © 2026 leedonwoo
