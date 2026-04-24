import { App, TFile, TFolder } from "obsidian";
import { splitFrontmatter } from "../concepts/frontmatter";
import { joinPath, todayIsoDate } from "../utils";

export interface AuditIssue {
  qid: string;
  level: "error" | "warning";
  message: string;
}

export interface RoundAuditResult {
  certRoot: string;
  roundId: string;
  totalQuestions: number;
  subjectCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  conceptCounts: Record<string, number>;
  passedCopyrightCount: number;
  needsReviewCount: number;
  issues: AuditIssue[];
  reportPath: string;
}

export async function auditRound(app: App, roundFolder: TFolder): Promise<RoundAuditResult> {
  const certRoot = inferCertRootFromRoundFolder(roundFolder.path);
  if (!certRoot) throw new Error("cert root 추정 실패. 05_rounds/{roundId}/ 폴더에서 실행하세요.");
  const roundId = roundFolder.name;

  const files: TFile[] = [];
  for (const c of roundFolder.children) {
    if (c instanceof TFile && /^Q\d+\.md$/i.test(c.name)) files.push(c);
  }
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const result: RoundAuditResult = {
    certRoot,
    roundId,
    totalQuestions: files.length,
    subjectCounts: {},
    difficultyCounts: { low: 0, mid: 0, high: 0 },
    conceptCounts: {},
    passedCopyrightCount: 0,
    needsReviewCount: 0,
    issues: [],
    reportPath: "",
  };

  for (const f of files) {
    const text = await app.vault.read(f);
    const { data, body } = splitFrontmatter(text);
    const qid = String(data["qid"] ?? f.basename);

    const subj = String(data["subject_code"] ?? "?");
    result.subjectCounts[subj] = (result.subjectCounts[subj] ?? 0) + 1;

    const diff = String(data["difficulty"] ?? "?");
    if (diff === "low" || diff === "mid" || diff === "high") {
      result.difficultyCounts[diff]++;
    } else {
      result.difficultyCounts[diff] = (result.difficultyCounts[diff] ?? 0) + 1;
      result.issues.push({ qid, level: "warning", message: `difficulty 값이 표준 외(${diff})` });
    }

    const primary = String(data["primary_concept"] ?? "");
    if (!primary) result.issues.push({ qid, level: "warning", message: "primary_concept 누락" });
    else result.conceptCounts[primary] = (result.conceptCounts[primary] ?? 0) + 1;

    // copyright_check
    const cc = data["copyright_check"];
    if (cc && typeof cc === "object") {
      const obj = cc as Record<string, unknown>;
      const passed = Boolean(obj["passed"]);
      if (passed) result.passedCopyrightCount++;
      const ratio = typeof obj["max_5gram_overlap_ratio"] === "number" ? (obj["max_5gram_overlap_ratio"] as number) : null;
      if (ratio !== null && ratio > 0.15) {
        result.issues.push({ qid, level: "warning", message: `5-gram 겹침 ${ratio.toFixed(2)} > 0.15` });
      }
    }

    const review = String(data["review_status"] ?? "");
    if (review === "needs_human") result.needsReviewCount++;

    // 본문 검증: 선택지 4개 / 정답 라인 / 해설 라인 존재
    const choiceCount = (body.match(/^####\s*\d+[).]/gm) ?? []).length;
    if (choiceCount !== 4) result.issues.push({ qid, level: "error", message: `선택지 ${choiceCount}개 (기대 4)` });
    if (!/^#####\s*정답/m.test(body)) result.issues.push({ qid, level: "error", message: "정답 라인 누락" });
    if (!/^######\s*해설/m.test(body)) result.issues.push({ qid, level: "warning", message: "해설 라인 누락" });
  }

  // 동일 primary_concept 과다 등장
  const overUsed = Object.entries(result.conceptCounts).filter(([, n]) => n >= 4);
  for (const [c, n] of overUsed) {
    result.issues.push({
      qid: "(round-wide)",
      level: "warning",
      message: `개념 \`${c}\` 가 ${n}회 등장 (3회 이하 권장).`,
    });
  }

  result.reportPath = joinPath(certRoot, "06_output", roundId, "audit.md");
  await writeFile(app, result.reportPath, renderReport(result));
  return result;
}

function renderReport(r: RoundAuditResult): string {
  const errors = r.issues.filter((i) => i.level === "error").length;
  const warnings = r.issues.filter((i) => i.level === "warning").length;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`round_id: "${r.roundId}"`);
  lines.push(`generated_at: "${todayIsoDate()}"`);
  lines.push(`errors: ${errors}`);
  lines.push(`warnings: ${warnings}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${r.roundId} 회차 검증 리포트`);
  lines.push("");
  lines.push(`총 ${r.totalQuestions}문항 · 저작권 검사 통과 ${r.passedCopyrightCount} · needs_human ${r.needsReviewCount} · 오류 ${errors} · 경고 ${warnings}`);
  lines.push("");
  lines.push("## 과목 분포");
  lines.push("| 과목코드 | 문항수 |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(r.subjectCounts)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("## 난이도 분포");
  lines.push("| 난이도 | 문항수 |");
  lines.push("|---|---:|");
  for (const [k, v] of Object.entries(r.difficultyCounts)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  lines.push("## 개념 빈도 (상위)");
  const sorted = Object.entries(r.conceptCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  if (sorted.length === 0) lines.push("- (없음)");
  else {
    lines.push("| 개념 | 등장 |");
    lines.push("|---|---:|");
    for (const [c, n] of sorted) lines.push(`| ${c} | ${n} |`);
  }
  lines.push("");
  lines.push("## 이슈");
  if (r.issues.length === 0) lines.push("- 없음 ✅");
  else {
    for (const i of r.issues) {
      const icon = i.level === "error" ? "❌" : "⚠️";
      lines.push(`- ${icon} ${i.qid}: ${i.message}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function inferCertRootFromRoundFolder(folderPath: string): string | null {
  const parts = folderPath.split("/");
  const idx = parts.findIndex((p) => p === "05_rounds");
  if (idx <= 0) return null;
  return parts.slice(0, idx).join("/");
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
