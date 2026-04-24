---
round_id: "{YYYY}-{N}회"
cert: "SQLD|COMP1|ENGINEER"
generated_at: "YYYY-MM-DD"
seed: ""                          # hash("{cert}_{round_id}")
question_count: 50
subject_distribution:
  S1: 10
  S2: 40
difficulty_distribution:
  low: 20
  mid: 20
  high: 10
concepts_used: []                 # 실제 출제된 개념 목록 (회차 전체)
review_status: "draft|approved"
---

# {cert} {round_id} 모의고사

> 생성일: {YYYY-MM-DD} · 시드: `{seed}`
> 시험 시간: {N}분 · 총 {N}문항 · 합격선: {N}점

## 문제 목록
| # | 과목 | 난이도 | 주 개념 | 링크 |
|---|------|--------|---------|------|
| 1 | S1 | low | 정규화 | [[Q001]] |
| 2 | S1 | mid | ERD표기법 | [[Q002]] |
| ... |  |  |  |  |

## 답안지
- [[answers]]

## 과목/난이도 분포 검증
<!-- 자동 생성: 실제 분포가 YAML 목표와 일치하는지 리포트 -->

## 출제 참고자료 (M4 사용 기록)
<!-- 어떤 참고자료가 몇 번 주입됐는지 로그 -->
- [[R-SQLD-001]]: 3회
- [[R-SQLD-006]]: 2회

## 저작권 검사 결과
- 원본 대비 최대 5-gram 겹침: 0.00
- 3어절 연속 일치: 0건
- needs_human 표시: 0건
