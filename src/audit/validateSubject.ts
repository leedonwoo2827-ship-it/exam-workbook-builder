import { App, TFile } from "obsidian";
import { parseSubjectYaml, SubjectConfig, flattenConcepts } from "../concepts/parseSubjectYaml";
import { joinPath, todayIsoDate } from "../utils";

export interface SubjectValidationIssue {
  level: "error" | "warning" | "info";
  message: string;
}

export interface SubjectValidationResult {
  certRoot: string;
  filePath: string;
  totalConcepts: number;
  totalSubjects: number;
  totalTopics: number;
  duplicateConcepts: string[];
  issues: SubjectValidationIssue[];
  reportPath: string;
}

export async function validateSubjectYaml(app: App, certRoot: string): Promise<SubjectValidationResult> {
  const filePath = joinPath(certRoot, "subject.yaml");
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    throw new Error(`subject.yaml을 찾지 못했습니다: ${filePath}`);
  }
  const yaml = await app.vault.read(file);
  let cfg: SubjectConfig;
  try {
    cfg = parseSubjectYaml(yaml);
  } catch (e) {
    throw new Error(`subject.yaml 파싱 실패: ${(e as Error).message}`);
  }

  const issues: SubjectValidationIssue[] = [];

  if (!cfg.cert) issues.push({ level: "error", message: "`cert` 필드가 비어있습니다." });
  if (!cfg.subjects || cfg.subjects.length === 0) {
    issues.push({ level: "error", message: "`subjects[]`가 비어있습니다 (최소 1개 필요)." });
  }

  const subjectCodes = new Set<string>();
  let totalTopics = 0;
  for (const g of cfg.subjects) {
    if (!g.code) issues.push({ level: "error", message: `subject 항목 중 \`code\` 비어있음: ${g.name || "(이름없음)"}` });
    else if (subjectCodes.has(g.code)) issues.push({ level: "error", message: `subject code 중복: ${g.code}` });
    else subjectCodes.add(g.code);

    if (!g.topics || g.topics.length === 0) {
      issues.push({ level: "warning", message: `${g.code || g.name} 과목에 topic이 없습니다.` });
      continue;
    }
    totalTopics += g.topics.length;
    for (const t of g.topics) {
      if (!t.tag) issues.push({ level: "warning", message: `${g.code} 안의 topic 중 \`tag\` 비어있음.` });
      if (!t.concepts || t.concepts.length === 0) {
        issues.push({ level: "warning", message: `${g.code}/${t.tag} topic에 concept이 없습니다.` });
      }
    }
  }

  const all = flattenConcepts(cfg);
  const seen = new Map<string, number>();
  for (const c of getAllConceptsRaw(cfg)) {
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([c]) => c);
  if (dup.length > 0) {
    issues.push({ level: "warning", message: `중복 concept ${dup.length}건: ${dup.slice(0, 8).join(", ")}${dup.length > 8 ? " ..." : ""}` });
  }

  if (all.length < 30) {
    issues.push({
      level: "warning",
      message: `concept 화이트리스트가 ${all.length}개로 적습니다. 회차 생성 시 동일 개념 반복 위험. 50개 이상 권장.`,
    });
  }

  // round_distribution과 subject 코드 매칭
  if (cfg.roundDistribution) {
    for (const code of Object.keys(cfg.roundDistribution)) {
      if (!subjectCodes.has(code)) {
        issues.push({
          level: "error",
          message: `round_distribution.${code} 가 subjects[].code에 존재하지 않습니다.`,
        });
      }
    }
  }

  // difficulty_ratio 합 ≈ 1
  if (cfg.difficultyRatio) {
    const sum = (cfg.difficultyRatio.low ?? 0) + (cfg.difficultyRatio.mid ?? 0) + (cfg.difficultyRatio.high ?? 0);
    if (Math.abs(sum - 1) > 0.01) {
      issues.push({
        level: "warning",
        message: `difficulty_ratio 합이 ${sum.toFixed(2)}로 1.0과 다릅니다. low+mid+high = 1.0이 표준.`,
      });
    }
  }

  if (cfg.totalQuestions !== undefined && cfg.roundDistribution) {
    const distSum = Object.values(cfg.roundDistribution).reduce((s, n) => s + n, 0);
    if (distSum !== cfg.totalQuestions) {
      issues.push({
        level: "warning",
        message: `total_questions(${cfg.totalQuestions}) ≠ round_distribution 합(${distSum}).`,
      });
    }
  }

  if (issues.length === 0) {
    issues.push({ level: "info", message: "검증 통과. M3·M4 단계에 사용 가능합니다." });
  }

  const reportPath = joinPath(certRoot, "_review", "subject_yaml_check.md");
  await writeFile(app, reportPath, renderReport({
    certRoot, filePath, cfg, totalConcepts: all.length, totalTopics, dup, issues,
  }));

  return {
    certRoot,
    filePath,
    totalConcepts: all.length,
    totalSubjects: cfg.subjects.length,
    totalTopics,
    duplicateConcepts: dup,
    issues,
    reportPath,
  };
}

function getAllConceptsRaw(cfg: SubjectConfig): string[] {
  const out: string[] = [];
  for (const g of cfg.subjects) for (const t of g.topics) for (const c of t.concepts) out.push(c);
  return out;
}

function renderReport(p: {
  certRoot: string;
  filePath: string;
  cfg: SubjectConfig;
  totalConcepts: number;
  totalTopics: number;
  dup: string[];
  issues: SubjectValidationIssue[];
}): string {
  const errors = p.issues.filter((i) => i.level === "error").length;
  const warnings = p.issues.filter((i) => i.level === "warning").length;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`subject_yaml: "${p.filePath}"`);
  lines.push(`generated_at: "${todayIsoDate()}"`);
  lines.push(`errors: ${errors}`);
  lines.push(`warnings: ${warnings}`);
  lines.push("---");
  lines.push("");
  lines.push(`# subject.yaml 검증 리포트`);
  lines.push("");
  lines.push("## 요약");
  lines.push(`- cert: \`${p.cfg.cert}\``);
  lines.push(`- subjects: ${p.cfg.subjects.length}, topics: ${p.totalTopics}, concepts (unique): ${p.totalConcepts}`);
  lines.push(`- 오류 ${errors} · 경고 ${warnings}`);
  lines.push("");
  lines.push("## 이슈 목록");
  if (p.issues.length === 0) {
    lines.push("- 없음");
  } else {
    for (const i of p.issues) {
      const icon = i.level === "error" ? "❌" : i.level === "warning" ? "⚠️" : "ℹ️";
      lines.push(`- ${icon} **${i.level}** — ${i.message}`);
    }
  }
  lines.push("");
  if (p.dup.length > 0) {
    lines.push("## 중복 concept");
    for (const d of p.dup) lines.push(`- ${d}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function writeFile(app: App, path: string, content: string): Promise<void> {
  const dir = path.split("/").slice(0, -1).join("/");
  await ensureFolderRecursive(app, dir);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) await app.vault.modify(existing, content);
  else await app.vault.create(path, content);
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  if (app.vault.getAbstractFileByPath(path)) return;
  const parent = path.split("/").slice(0, -1).join("/");
  if (parent) await ensureFolderRecursive(app, parent);
  await app.vault.createFolder(path);
}
