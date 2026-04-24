---
qid: "Q000"                       # {cert}/05_rounds/{round}/Q001.md ...
round_id: "{YYYY}-{N}회"
cert: "SQLD|COMP1|ENGINEER"
subject_code: "S1"                # subject.yaml의 subjects[].code
source_id: ""                     # 원본 기출인 경우 YYMMDD_{cert}_{slug}
source_page: 0                    # 원본 페이지 (없으면 0)
difficulty: "low|mid|high"
concepts:                         # subject.yaml 화이트리스트
  - 정규화
primary_concept: "정규화"
extraction_confidence: 1.0        # 1.0 = 신규 생성(원본 없음)
generation:                       # 신규 생성된 경우에만
  model_version: "gemma2:9b"
  prompt_hash: ""
  references_used: []
  generated_at: ""
copyright_check:
  max_5gram_overlap: 0.0
  passed: true
review_status: "auto|needs_human|approved"
---

### Q{n}
{발문}

#### 1) {선택지1}
#### 2) {선택지2}
#### 3) {선택지3}
#### 4) {선택지4}

##### 정답: {번호}

###### 해설: {해설. 개념 백링크 [[primary_concept]] 포함}
