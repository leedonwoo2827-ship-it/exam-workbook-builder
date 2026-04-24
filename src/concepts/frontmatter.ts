import { parseYaml, stringifyYaml } from "obsidian";

/**
 * markdown 텍스트의 frontmatter를 객체로 파싱하고 본문과 분리한다.
 * frontmatter가 없으면 빈 객체.
 */
export function splitFrontmatter(text: string): {
  data: Record<string, unknown>;
  body: string;
  hadFrontmatter: boolean;
} {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: text, hadFrontmatter: false };
  const yamlText = m[1];
  let data: Record<string, unknown> = {};
  try {
    data = (parseYaml(yamlText) ?? {}) as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { data, body: text.slice(m[0].length), hadFrontmatter: true };
}

export function joinFrontmatter(data: Record<string, unknown>, body: string): string {
  const yamlText = stringifyYaml(data).trimEnd();
  return `---\n${yamlText}\n---\n\n${body.replace(/^\s+/, "")}`;
}

/** data에 patch를 깊이 1 머지 (배열·원시값은 덮어쓰기, 객체는 머지). */
export function mergeFrontmatter(
  data: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const [k, v] of Object.entries(patch)) {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = { ...(out[k] as Record<string, unknown>), ...(v as Record<string, unknown>) };
    } else {
      out[k] = v;
    }
  }
  return out;
}
