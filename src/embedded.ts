// assets/ 폴더의 md 파일들은 esbuild의 loader: { ".md": "text" } 설정으로
// 번들 시 문자열로 인라인됩니다.

import ocrVisionPrompt from "../assets/prompts/02_ocr_vision.md";
import structurePrompt from "../assets/prompts/03_structure.md";
import conceptTagPrompt from "../assets/prompts/04_concept_tag.md";
import generatePrompt from "../assets/prompts/05_generate.md";

import examOverviewTpl from "../assets/templates/exam_overview.md";
import referenceNoteTpl from "../assets/templates/reference_note.md";
import questionTpl from "../assets/templates/question.md";
import conceptTpl from "../assets/templates/concept.md";
import roundsetTpl from "../assets/templates/roundset.md";

export const PROMPTS = {
  ocrVision: ocrVisionPrompt,
  structure: structurePrompt,
  conceptTag: conceptTagPrompt,
  generate: generatePrompt,
};

export const TEMPLATES = {
  examOverview: examOverviewTpl,
  referenceNote: referenceNoteTpl,
  question: questionTpl,
  concept: conceptTpl,
  roundset: roundsetTpl,
};

export const DEFAULT_SUBJECT_YAML = `# 과목 체계 + 태그 화이트리스트 — 자격증별 주관기관 출제기준 기반으로 작성
# 이 파일은 스켈레톤. 실제 운영 전 subjects/topics/concepts 채워야 함.

cert: "CERT_CODE"
full_name: ""
total_questions: 50
pass_score: 60

subjects:
  - code: "S1"
    name: "과목1"
    weight: 25
    topics:
      - tag: "주제1"
        weight: 15
        concepts:
          - 개념1
          - 개념2

  - code: "S2"
    name: "과목2"
    weight: 25
    topics:
      - tag: "주제2"
        weight: 10
        concepts:
          - 개념3

round_distribution:
  S1: 25
  S2: 25

difficulty_ratio:
  low: 0.4
  mid: 0.4
  high: 0.2

stratified_sampling:
  max_tag_repeat: 3

round_naming: "{year}-{n}회"
`;

export const REFERENCES_README = `# 00_참고자료 — 출제 시 근거 자료

신규 문제 생성 단계에서 LLM 컨텍스트로 주입되어 **저작권 안전한 출제**의 근거가 됩니다.

## 카테고리
- **공식출제기준** — 주관기관 배포 출제 영역 문서 요약
- **공식예시** — 공식 홈페이지 샘플 문항, 공개 기출
- **핵심개념정리** — 본인 표현으로 재작성한 개념 노트
- **함정오답패턴** — 자주 틀리는 지점, 오개념
- **실무예제** — 실제 쿼리/코드/에러 사례
- **기출경향** — 연도별 출제 패턴 분석
- **용어사전** — 약어/전문용어 정의

## 양식
모든 참고자료 노트는 \`assets/templates/reference_note.md\`를 따릅니다.

## 저작권
- \`copyright_safe: true\` — 본인 재작성·공공자료. 생성 프롬프트에 본문까지 주입 OK.
- \`copyright_safe: false\` — 시중 교재 발췌. **핵심포인트·힌트만** 주입, 원문 배제.
`;
