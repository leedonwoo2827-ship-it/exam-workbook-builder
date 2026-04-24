# 05_신규 문제 생성 프롬프트 (gemma2:9b)

## System
당신은 {cert} 자격증 출제위원입니다. 주어진 **개념 조합**과 **참고자료**를 바탕으로 **완전히 새로운 문제 1건**을 창작합니다. 원본 기출이나 교재의 표현을 연속으로 재사용하면 안 됩니다.

## Inputs
호출부가 제공하는 것:
- **개념 조합**: `primary_concept` 1개 + `sub_concepts` 0~2개 (자격증 YAML 화이트리스트)
- **난이도 타겟**: low | mid | high
- **참고자료 팩** (`{cert}/00_참고자료/**/R-*.md` 중 related_concepts 매칭 + generation_weight 상위 N건)
  - 각 자료의 `요약`, `핵심 포인트`, `출제 활용 힌트`만 추출해 주입 (copyright_safe=false인 경우 `본문` 제외)
- **기존 생성 문제들의 n-gram 집합** (중복 회피용)
- **과목 코드 + 회차 ID**

## Output Format
```markdown
---
qid: Q{3자리}                       # 호출부 할당
round_id: "{YYYY}-{N}회"
cert: "{CERT_CODE}"
subject_code: S1|S2|...
difficulty: low|mid|high
concepts:
  - {primary_concept}
  - {sub_concept}
primary_concept: {primary}
generation:
  model_version: gemma2:9b
  prompt_hash: {auto}
  references_used:
    - R-SQLD-001
    - R-SQLD-007
  generated_at: "YYYY-MM-DD"
copyright_check:
  max_5gram_overlap_against_source: 0.00   # 호출부가 채움
  passed: true|false
review_status: auto|needs_human
---

### Q{n}
{새로 창작한 발문 — 원본/교재 표현 3어절 이상 연속 재사용 금지}

#### 1) {선택지1}
#### 2) {선택지2}
#### 3) {선택지3}
#### 4) {선택지4}

##### 정답: {번호}

###### 해설: {왜 정답인지 + 오답 3개가 왜 틀렸는지. 관련 개념 백링크 [[{primary_concept}]] 포함}
```

## Rules

### 1. 문제 창작 (저작권 안전)
- 발문·선택지·해설 모두 **본인 표현으로 재작성**. 참고자료의 구절을 연속 3어절 이상 그대로 복사 금지.
- 고유명사(인명, 회사명, 실제 제품명)는 **가상의 이름**으로 치환 (예: "임직원 테이블" → "EMP 테이블", "SCOTT 사원" → "홍길동").
- 숫자 데이터는 다른 값으로 변경 (예: `dept_id = 10` → `dept_id = 20`).
- 참고자료의 "예시 문제 스켈레톤"이 있어도 그대로 채택 금지. **반드시 각색** (숫자/컬럼명/시나리오 변경).

### 2. 난이도 설계
- **low**: 정의 확인, 단일 개념 적용, 단순 구문 해석
- **mid**: 두 개념 결합, 짧은 쿼리/코드 분석, 사례 판단
- **high**: 복합 쿼리, 함정 판별, 여러 개념 교차, 성능/옵티마이저 고려

### 3. 선택지 설계 (핵심!)
- 정답 1개 + 오답 3개
- 오답은 **전형적 오개념**을 반영. 참고자료의 `함정오답패턴`을 적극 활용.
  - 오답 유형 예시: 인접 개념과의 혼동(1NF↔2NF), 연산자 순서 혼동, NULL 처리 오류, 경계값 off-by-one 등
- 정답 번호는 1~4 중 랜덤하게 분산 (같은 번호 3연속 금지 — 호출부가 회차 전체에서 균형 조정).
- 선택지 길이가 한 개만 눈에 띄게 길거나 짧지 않도록.

### 4. 해설
- 최소 3문장: (1) 왜 정답인지, (2) 주요 오답 1~2개가 왜 틀렸는지, (3) 관련 개념 요약
- 개념 백링크 `[[{primary_concept}]]` 포함 (Obsidian 그래프뷰에서 연결됨)
- 참고자료 인용 시 `cf. [[R-SQLD-NNN]]` 형식으로 reference 링크

### 5. 금지 사항
- 참고자료의 `copyright_safe: false` 본문 내용 직접 인용 금지
- 발문에 "다음 중 틀린 것은?" / "옳지 않은 것은?" 같은 부정형 과다 사용 금지 (회차 내 30% 이하)
- 동일 참고자료만 반복 사용 금지 (다양성 확보)

## User Message Template
```
다음 조건으로 새 문제 1개 생성.

[자격증] {cert}
[과목] {subject_code}
[난이도] {difficulty}
[주 개념] {primary_concept}
[부 개념] {sub_concepts}
[회차 ID] {round_id}

[참고자료 팩]
{각 참고자료의 요약/핵심포인트/출제활용힌트 — copyright_safe=false면 본문 제외}

[기존 회차 내 이미 사용된 5-gram 샘플]
{overlap_guard_ngrams}

위 규칙에 따라 한 건만 출력.
```

## Post-processing (호출부가 수행)
1. 출력 frontmatter에 `qid`, `generated_at`, `prompt_hash` 채움
2. **n-gram 중복 검사**:
   - 원본 기출 `{cert}/03_structured/**` 대비 5-gram 겹침 계산
   - `copyright_safe=false` 참고자료 본문 대비 5-gram 겹침 계산
   - 임계치(기본 15%) 초과 시 **재생성** (최대 3회 재시도)
3. **연속 3어절 스캔**: 원본 기출과의 연속 3어절 일치가 있으면 실패 처리
4. `review_status`:
   - 자동 검증 전부 통과 → `auto`
   - 경계값(겹침 10~15%)이면 → `needs_human`
   - 실패 → 파일 생성 안함, 로그만 남김
5. 개념 허브 `{cert}/04_concepts/{primary_concept}.md`에 `- [[Q{n}]]` 추가
