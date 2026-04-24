export interface ConceptTagResult {
  concepts: string[];           // 1~3 항목, 화이트리스트 또는 candidate:접두어
  primaryConcept: string;       // 비어있을 수 있으나 호출부가 fallback
  rationale: string;
}

/**
 * gemma2 응답(JSON 문자열)에서 concepts/primary_concept/concept_rationale을 파싱.
 * Ollama format=json 으로 받았을 때를 가정하지만, 자유 응답에서도 첫 JSON 객체를 추출 시도한다.
 */
export function parseTagResponse(text: string): ConceptTagResult {
  const obj = extractFirstJsonObject(text);
  if (!obj) return { concepts: [], primaryConcept: "", rationale: "" };

  const concepts: string[] = Array.isArray(obj["concepts"])
    ? (obj["concepts"] as unknown[]).map((c) => String(c)).filter((s) => s.length > 0)
    : [];
  const primaryConcept = String(obj["primary_concept"] ?? "");
  const rationale = String(obj["concept_rationale"] ?? obj["rationale"] ?? "");
  return { concepts: concepts.slice(0, 3), primaryConcept, rationale };
}

function extractFirstJsonObject(text: string): Record<string, unknown> | null {
  // 코드펜스 제거
  const stripped = text.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
  // 첫 '{'부터 매칭되는 '}'까지를 시도
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = stripped.slice(start, i + 1);
        try {
          const parsed = JSON.parse(slice) as Record<string, unknown>;
          return parsed;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** 화이트리스트에 없는 항목을 candidate:접두어로 변환. 빈 문자열은 제외. */
export function normalizeConcepts(concepts: string[], whitelist: string[]): string[] {
  const set = new Set(whitelist);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of concepts) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const stripped = trimmed.replace(/^candidate:/, "").trim();
    if (!stripped) continue;
    const final = set.has(stripped) ? stripped : `candidate:${stripped}`;
    if (seen.has(final)) continue;
    seen.add(final);
    out.push(final);
  }
  return out;
}
