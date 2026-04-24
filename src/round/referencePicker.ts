import { App, TFile, TFolder } from "obsidian";
import { joinPath } from "../utils";
import { parseYaml } from "obsidian";

export interface ReferenceNote {
  refId: string;
  cert: string;
  category: string;
  title: string;
  copyrightSafe: boolean;
  relatedConcepts: string[];
  generationWeight: number;
  filePath: string;
  body: string;            // 본문 (frontmatter 제외)
}

/** {certRoot}/00_참고자료 하위의 모든 R-*.md 노트를 재귀 로드. */
export async function loadReferences(app: App, certRoot: string): Promise<ReferenceNote[]> {
  const root = app.vault.getAbstractFileByPath(joinPath(certRoot, "00_참고자료"));
  if (!(root instanceof TFolder)) return [];
  const out: ReferenceNote[] = [];
  await walk(app, root, out);
  return out;
}

async function walk(app: App, folder: TFolder, out: ReferenceNote[]): Promise<void> {
  for (const child of folder.children) {
    if (child instanceof TFolder) {
      await walk(app, child, out);
    } else if (child instanceof TFile && child.extension === "md" && /^R[-_]/i.test(child.name)) {
      const text = await app.vault.read(child);
      const parsed = parseRefNote(text, child.path);
      if (parsed) out.push(parsed);
    }
  }
}

function parseRefNote(text: string, path: string): ReferenceNote | null {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  let data: Record<string, unknown> = {};
  try {
    data = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }
  const body = text.slice(m[0].length);
  return {
    refId: String(data["ref_id"] ?? ""),
    cert: String(data["cert"] ?? ""),
    category: String(data["category"] ?? ""),
    title: String(data["title"] ?? ""),
    copyrightSafe: Boolean(data["copyright_safe"]),
    relatedConcepts: Array.isArray(data["related_concepts"])
      ? (data["related_concepts"] as unknown[]).map((c) => String(c))
      : [],
    generationWeight:
      typeof data["generation_weight"] === "number" ? (data["generation_weight"] as number) : 0.5,
    filePath: path,
    body,
  };
}

/**
 * 주어진 개념 조합에 대해 참고자료 팩을 선별.
 * - related_concepts에 conceptSet 중 하나라도 포함된 자료만 후보
 * - generation_weight 내림차순
 * - 상위 maxCount 개 반환
 */
export function pickReferencesForConcepts(
  refs: ReferenceNote[],
  conceptSet: Set<string>,
  maxCount = 3
): ReferenceNote[] {
  const matched = refs.filter((r) => r.relatedConcepts.some((c) => conceptSet.has(c)));
  matched.sort((a, b) => b.generationWeight - a.generationWeight);
  return matched.slice(0, maxCount);
}

/**
 * 프롬프트에 주입할 참고자료 컨텍스트 문자열을 생성.
 * copyright_safe=false 자료는 본문 제외, 핵심 포인트 섹션만 발췌.
 */
export function renderReferencePack(refs: ReferenceNote[]): string {
  if (refs.length === 0) return "(참고자료 없음 — 일반 지식과 화이트리스트 개념만 사용)";
  const blocks: string[] = [];
  for (const r of refs) {
    const safe = r.copyrightSafe;
    const summary = extractSection(r.body, ["요약 (2~3줄)", "요약"]);
    const points = extractSection(r.body, ["핵심 포인트 (bullet)", "핵심 포인트"]);
    const hint = extractSection(r.body, ["출제 활용 힌트"]);
    const block: string[] = [];
    block.push(`### [${r.refId}] ${r.title}`);
    block.push(`- copyright_safe: ${safe}`);
    block.push(`- related_concepts: ${r.relatedConcepts.join(", ")}`);
    if (summary) block.push("\n[요약]\n" + summary);
    if (points) block.push("\n[핵심 포인트]\n" + points);
    if (hint) block.push("\n[출제 활용 힌트]\n" + hint);
    if (safe) {
      const body = stripSections(r.body, ["요약 (2~3줄)", "요약", "핵심 포인트 (bullet)", "핵심 포인트", "출제 활용 힌트"]);
      if (body.trim().length > 0) block.push("\n[본문 발췌]\n" + body.trim().slice(0, 1500));
    }
    blocks.push(block.join("\n"));
  }
  return blocks.join("\n\n---\n\n");
}

function extractSection(body: string, headings: string[]): string | null {
  for (const h of headings) {
    const re = new RegExp(`^##\\s*${escapeRegExp(h)}\\s*\n([\\s\\S]*?)(?=\\n##\\s|$)`, "m");
    const m = body.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function stripSections(body: string, headings: string[]): string {
  let out = body;
  for (const h of headings) {
    const re = new RegExp(`(^##\\s*${escapeRegExp(h)}\\s*\n)([\\s\\S]*?)(?=\\n##\\s|$)`, "m");
    out = out.replace(re, "");
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
