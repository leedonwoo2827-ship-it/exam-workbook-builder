import { parseYaml } from "obsidian";

export interface SubjectTopic {
  tag: string;
  weight?: number;
  concepts: string[];
}

export interface SubjectGroup {
  code: string;            // 예: S1
  name: string;
  weight?: number;
  topics: SubjectTopic[];
}

export interface SubjectConfig {
  cert: string;
  fullName?: string;
  totalQuestions?: number;
  passScore?: number;
  subjects: SubjectGroup[];
  roundDistribution?: Record<string, number>;
  difficultyRatio?: { low?: number; mid?: number; high?: number };
  stratifiedSampling?: { maxTagRepeat?: number };
  roundNaming?: string;
}

export function parseSubjectYaml(yamlText: string): SubjectConfig {
  const raw = (parseYaml(yamlText) ?? {}) as Record<string, unknown>;
  const subjects: SubjectGroup[] = [];
  const subjectsRaw = (raw["subjects"] ?? []) as unknown[];
  for (const s of subjectsRaw) {
    if (!s || typeof s !== "object") continue;
    const sObj = s as Record<string, unknown>;
    const topicsRaw = (sObj["topics"] ?? []) as unknown[];
    const topics: SubjectTopic[] = [];
    for (const t of topicsRaw) {
      if (!t || typeof t !== "object") continue;
      const tObj = t as Record<string, unknown>;
      topics.push({
        tag: String(tObj["tag"] ?? ""),
        weight: typeof tObj["weight"] === "number" ? (tObj["weight"] as number) : undefined,
        concepts: Array.isArray(tObj["concepts"])
          ? (tObj["concepts"] as unknown[]).map((c) => String(c))
          : [],
      });
    }
    subjects.push({
      code: String(sObj["code"] ?? ""),
      name: String(sObj["name"] ?? ""),
      weight: typeof sObj["weight"] === "number" ? (sObj["weight"] as number) : undefined,
      topics,
    });
  }

  return {
    cert: String(raw["cert"] ?? ""),
    fullName: typeof raw["full_name"] === "string" ? (raw["full_name"] as string) : undefined,
    totalQuestions:
      typeof raw["total_questions"] === "number" ? (raw["total_questions"] as number) : undefined,
    passScore: typeof raw["pass_score"] === "number" ? (raw["pass_score"] as number) : undefined,
    subjects,
    roundDistribution: (raw["round_distribution"] as Record<string, number> | undefined) ?? undefined,
    difficultyRatio:
      (raw["difficulty_ratio"] as { low?: number; mid?: number; high?: number } | undefined) ?? undefined,
    stratifiedSampling:
      (raw["stratified_sampling"] as { max_tag_repeat?: number } | undefined) !== undefined
        ? { maxTagRepeat: (raw["stratified_sampling"] as { max_tag_repeat?: number }).max_tag_repeat }
        : undefined,
    roundNaming: typeof raw["round_naming"] === "string" ? (raw["round_naming"] as string) : undefined,
  };
}

/** 모든 그룹의 모든 토픽의 모든 컨셉을 평탄화한 화이트리스트. */
export function flattenConcepts(cfg: SubjectConfig): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of cfg.subjects) {
    for (const t of g.topics) {
      for (const c of t.concepts) {
        if (c && !seen.has(c)) {
          seen.add(c);
          out.push(c);
        }
      }
    }
  }
  return out;
}

/** 컨셉이 어느 (subject_code, topic_tag)에 속하는지 역인덱스. */
export function buildConceptIndex(cfg: SubjectConfig): Map<string, { subjectCode: string; topicTag: string }> {
  const idx = new Map<string, { subjectCode: string; topicTag: string }>();
  for (const g of cfg.subjects) {
    for (const t of g.topics) {
      for (const c of t.concepts) {
        if (!idx.has(c)) idx.set(c, { subjectCode: g.code, topicTag: t.tag });
      }
    }
  }
  return idx;
}
