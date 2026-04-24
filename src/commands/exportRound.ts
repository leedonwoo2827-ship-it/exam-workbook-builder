import { App, TFile, TFolder } from "obsidian";
import { joinPath, todayIsoDate } from "../utils";
import { splitFrontmatter } from "../concepts/frontmatter";

export interface ExportRoundInput {
  roundFolder: TFolder;        // 05_rounds/{roundId}
  /** 인쇄용 정답 표기. "tail"=답안지 별도, "inline"=각 문제 뒤에 정답·해설, "none"=시험지만. */
  answerStyle: "tail" | "inline" | "none";
}

export interface ExportRoundResult {
  outputDir: string;
  printablePath: string;
  answersPath: string | null;
  questionCount: number;
}

interface QuestionFile {
  qid: string;
  filePath: string;
  frontmatter: Record<string, unknown>;
  bodyText: string;
}

export async function exportRound(app: App, input: ExportRoundInput): Promise<ExportRoundResult> {
  const certRoot = inferCertRootFromRoundFolder(input.roundFolder.path);
  if (!certRoot) throw new Error("cert root 추정 실패. 05_rounds/{roundId}/ 폴더에서 실행하세요.");
  const roundId = input.roundFolder.name;

  const qFiles = await loadQuestionFiles(app, input.roundFolder);
  if (qFiles.length === 0) throw new Error("회차 폴더에 Q*.md 가 없습니다.");

  const outputDir = joinPath(certRoot, "06_output", roundId);
  await ensureFolderRecursive(app, outputDir);

  const certCode = certRoot.split("/").slice(-1)[0].toUpperCase();
  const printable = renderPrintable(qFiles, certCode, roundId, input.answerStyle);
  const printablePath = joinPath(outputDir, "printable.md");
  await writeFile(app, printablePath, printable);

  let answersPath: string | null = null;
  if (input.answerStyle === "tail" || input.answerStyle === "none") {
    const answers = renderAnswers(qFiles, certCode, roundId);
    answersPath = joinPath(outputDir, "answers_with_explanations.md");
    await writeFile(app, answersPath, answers);
  }

  return {
    outputDir,
    printablePath,
    answersPath,
    questionCount: qFiles.length,
  };
}

function renderPrintable(
  files: QuestionFile[],
  certCode: string,
  roundId: string,
  style: "tail" | "inline" | "none"
): string {
  const lines: string[] = [];
  lines.push(`# ${certCode} ${roundId} 모의고사`);
  lines.push("");
  lines.push(`> 출제일: ${todayIsoDate()} · 총 ${files.length}문항`);
  lines.push("");
  lines.push("> hwpx_writer / pptx_writer MCP로 이 파일을 .hwpx / .pptx로 변환할 수 있습니다.");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const num = i + 1;
    const { stem, choices, answer, explanation } = parseQuestionBody(f.bodyText);

    lines.push(`## ${num}. ${stem.replace(/^\s+|\s+$/g, "")}`);
    lines.push("");
    for (let c = 0; c < choices.length; c++) {
      lines.push(`${["①", "②", "③", "④"][c] ?? `${c + 1})`} ${choices[c]}`);
    }
    lines.push("");

    if (style === "inline") {
      lines.push(`> **정답**: ${answer}`);
      lines.push("");
      lines.push(`> **해설**: ${explanation}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  if (style === "tail") {
    lines.push("");
    lines.push("# 답안");
    lines.push("");
    for (let i = 0; i < files.length; i++) {
      const { answer } = parseQuestionBody(files[i].bodyText);
      lines.push(`${i + 1}. ${answer}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderAnswers(files: QuestionFile[], certCode: string, roundId: string): string {
  const lines: string[] = [];
  lines.push(`# ${certCode} ${roundId} 정답·해설`);
  lines.push("");

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const num = i + 1;
    const { stem, answer, explanation } = parseQuestionBody(f.bodyText);
    const primary = String(f.frontmatter["primary_concept"] ?? "");
    lines.push(`## ${num}. ${stem.split("\n")[0].slice(0, 80)}`);
    if (primary) lines.push(`- 주 개념: [[${primary}]]`);
    lines.push(`- 정답: **${answer}**`);
    lines.push("");
    lines.push(`${explanation}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function parseQuestionBody(body: string): {
  stem: string;
  choices: string[];
  answer: string;
  explanation: string;
} {
  const headingMatch = body.match(/^###\s+Q\S*\s*\n([\s\S]*?)(?=\n####\s|$)/m);
  const stem = headingMatch ? headingMatch[1].trim() : "";

  const choices: string[] = [];
  const choiceRe = /^####\s*(\d+)[).]\s*(.+?)$/gm;
  let m: RegExpExecArray | null;
  while ((m = choiceRe.exec(body)) !== null) {
    choices.push(m[2].trim());
  }

  const answerMatch = body.match(/^#####\s*정답\s*[:：]?\s*(.+)$/m);
  const answer = answerMatch ? answerMatch[1].trim() : "?";

  const explanationMatch = body.match(/^######\s*해설\s*[:：]?\s*([\s\S]*)$/m);
  const explanation = explanationMatch ? explanationMatch[1].trim() : "";

  return { stem, choices, answer, explanation };
}

async function loadQuestionFiles(app: App, folder: TFolder): Promise<QuestionFile[]> {
  const out: QuestionFile[] = [];
  const items: TFile[] = [];
  for (const child of folder.children) {
    if (child instanceof TFile && /^Q\d+\.md$/i.test(child.name)) items.push(child);
  }
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const f of items) {
    const text = await app.vault.read(f);
    const { data, body } = splitFrontmatter(text);
    out.push({
      qid: String(data["qid"] ?? f.basename),
      filePath: f.path,
      frontmatter: data,
      bodyText: body,
    });
  }
  return out;
}

function inferCertRootFromRoundFolder(folderPath: string): string | null {
  const parts = folderPath.split("/");
  const idx = parts.findIndex((p) => p === "05_rounds");
  if (idx <= 0) return null;
  return parts.slice(0, idx).join("/");
}

export function isRoundFolder(folder: TFolder): boolean {
  const parts = folder.path.split("/");
  return parts.length >= 2 && parts[parts.length - 2] === "05_rounds";
}

async function writeFile(app: App, path: string, content: string): Promise<void> {
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
