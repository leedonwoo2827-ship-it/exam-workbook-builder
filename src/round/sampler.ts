import { makeRng, pickWeighted, seedFromString, shuffleInPlace } from "./seedRandom";
import { SubjectConfig } from "../concepts/parseSubjectYaml";

export type Difficulty = "low" | "mid" | "high";

export interface SlotPlan {
  index: number;                // 1-based 회차 내 일련 번호
  subjectCode: string;
  topicTag: string;
  primaryConcept: string;       // 화이트리스트 개념
  difficulty: Difficulty;
}

export interface SamplerInput {
  subject: SubjectConfig;
  totalQuestions: number;       // 회차 총 문제 수
  seed: string;                 // 보통 `${cert}_${roundId}`
}

/**
 * subject.yaml의 round_distribution(과목별 N) + difficulty_ratio(low:mid:high) 기반으로
 * 회차 슬롯을 결정적으로 만든다. 각 슬롯에는 subject_code/topic_tag/primary_concept/difficulty가 채워진다.
 *
 * stratified: 한 회차 내 동일 primary_concept 등장 횟수가 max_tag_repeat를 넘지 않도록
 * round-robin과 weight 기반 샘플링을 병행.
 */
export function planRound(input: SamplerInput): SlotPlan[] {
  const rng = makeRng(seedFromString(input.seed));
  const subjectsTargets = computeSubjectTargets(input.subject, input.totalQuestions);
  const difficultyTargets = computeDifficultyTargets(input.subject, input.totalQuestions);
  const maxRepeat = input.subject.stratifiedSampling?.maxTagRepeat ?? 3;

  const slots: SlotPlan[] = [];
  const conceptUsage: Record<string, number> = {};

  let index = 1;
  for (const [subjectCode, target] of Object.entries(subjectsTargets)) {
    const group = input.subject.subjects.find((g) => g.code === subjectCode);
    if (!group || target <= 0) continue;

    for (let i = 0; i < target; i++) {
      const topicChoices = group.topics.map((t) => ({
        item: t,
        weight: typeof t.weight === "number" && t.weight > 0 ? t.weight : 1,
      }));
      const topic = pickWeighted(topicChoices, rng);
      if (!topic || topic.concepts.length === 0) continue;

      // primary 개념 선택 — usage 한도 미만 우선
      const eligible = topic.concepts.filter((c) => (conceptUsage[c] ?? 0) < maxRepeat);
      const pool = eligible.length > 0 ? eligible : topic.concepts;
      const primary = pool[Math.floor(rng() * pool.length)];
      conceptUsage[primary] = (conceptUsage[primary] ?? 0) + 1;

      slots.push({
        index: 0,
        subjectCode: group.code,
        topicTag: topic.tag,
        primaryConcept: primary,
        difficulty: "mid",     // 임시, 아래에서 분포에 맞춰 라벨링
      });
    }
  }

  // 난이도 라벨링: 슬롯 셔플 후 난이도 카운트만큼 순서대로 배정
  shuffleInPlace(slots, rng);
  const diffSeq: Difficulty[] = [];
  for (const d of ["low", "mid", "high"] as Difficulty[]) {
    for (let i = 0; i < (difficultyTargets[d] ?? 0); i++) diffSeq.push(d);
  }
  // diffSeq 길이 ≠ slots 길이일 때 mid로 채움
  while (diffSeq.length < slots.length) diffSeq.push("mid");
  shuffleInPlace(diffSeq, rng);
  for (let i = 0; i < slots.length; i++) {
    slots[i].difficulty = diffSeq[i] ?? "mid";
    slots[i].index = i + 1;
  }
  return slots;
}

function computeSubjectTargets(subject: SubjectConfig, total: number): Record<string, number> {
  if (subject.roundDistribution && Object.keys(subject.roundDistribution).length > 0) {
    return { ...subject.roundDistribution };
  }
  // weight 기반 비례 배분
  const weights = subject.subjects.map((g) => ({ code: g.code, w: g.weight ?? 0 }));
  const sum = weights.reduce((s, x) => s + x.w, 0);
  if (sum > 0) {
    const out: Record<string, number> = {};
    let assigned = 0;
    weights.forEach((x, i) => {
      const n = i === weights.length - 1 ? total - assigned : Math.round((x.w / sum) * total);
      out[x.code] = n;
      assigned += n;
    });
    return out;
  }
  // fallback: 균등 분배
  const equal: Record<string, number> = {};
  const n = subject.subjects.length || 1;
  const each = Math.floor(total / n);
  let rem = total - each * n;
  subject.subjects.forEach((g) => {
    equal[g.code] = each + (rem-- > 0 ? 1 : 0);
  });
  return equal;
}

function computeDifficultyTargets(subject: SubjectConfig, total: number): Record<Difficulty, number> {
  const r = subject.difficultyRatio ?? { low: 0.4, mid: 0.4, high: 0.2 };
  const lowN = Math.round((r.low ?? 0) * total);
  const highN = Math.round((r.high ?? 0) * total);
  const midN = total - lowN - highN;
  return { low: lowN, mid: Math.max(0, midN), high: highN };
}
