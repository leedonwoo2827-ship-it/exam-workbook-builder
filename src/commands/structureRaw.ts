import { App, TFile, TFolder } from "obsidian";
import { generateText } from "../ollama";
import { PROMPTS } from "../embedded";
import { joinPath, pad, todayIsoDate } from "../utils";
import {
  inferCertRootFromRawPath,
  inferSourceIdFromRawPath,
  parseRawMd,
  RawMeta,
} from "../structure/parseRaw";
import { parseStructuredOutput, ParsedQuestion } from "../structure/parseModel";
import { DEFAULT_VALIDATION, validateQuestion, ValidationResult } from "../structure/validate";

export interface StructureRawInput {
  rawFile: TFile;
  ollamaUrl: string;
  structureModel: string;
  timeoutMs: number;
  /** 같은 source_page에 이미 Q파일이 있으면 어떻게 할지. 기본 skip. */
  onConflict?: "skip" | "overwrite";
}

export interface StructureRawResult {
  rawFile: TFile;
  written: string[];           // 저장된 Q 파일 경로
  skippedExisting: number;
  invalid: number;             // 검증 실패로 _review 큐로 간 수
  total: number;               // 모델이 추출한 문제 수 (검증 전)
}

export async function structureRaw(app: App, input: StructureRawInput): Promise<StructureRawResult> {
  if (!input.rawFile.name.endsWith(".raw.md")) {
    throw new Error("'.raw.md' 파일만 지원합니다.");
  }

  const certRoot = inferCertRootFromRawPath(input.rawFile.path);
  const sourceId = inferSourceIdFromRawPath(input.rawFile.path);
  if (!certRoot || !sourceId) {
    throw new Error("경로에서 cert root / sourceId를 추정할 수 없습니다. 02_raw/<sourceId>/ 하위에 두세요.");
  }

  const content = await app.vault.read(input.rawFile);
  const { meta, body } = parseRawMd(content);

  if (!body || body.length < 30) {
    throw new Error("raw 본문이 비어있거나 너무 짧습니다.");
  }

  const response = await generateText({
    url: input.ollamaUrl,
    model: input.structureModel,
    system: PROMPTS.structure,
    prompt: buildUserMessage(body, meta),
    temperature: 0.2,
    timeoutMs: input.timeoutMs,
  });

  const parsed = parseStructuredOutput(response);

  const structuredDir = joinPath(certRoot, "03_structured", sourceId);
  await ensureFolderRecursive(app, structuredDir);

  const written: string[] = [];
  let skippedExisting = 0;
  let invalid = 0;

  const existingMaxQ = await currentMaxQid(app, structuredDir);
  let nextQid = existingMaxQ + 1;
  const onConflict = input.onConflict ?? "skip";

  for (const q of parsed) {
    const validation = validateQuestion(q, DEFAULT_VALIDATION);
    if (!validation.passed) {
      invalid++;
      await appendReviewLog(app, certRoot, sourceId, meta.sourcePage, q, validation);
      continue;
    }

    // 같은 페이지·같은 발문 첫 30자가 이미 있으면 충돌로 본다
    const conflict = await findConflictByPageAndStem(app, structuredDir, meta.sourcePage, q.stem);
    if (conflict) {
      if (onConflict === "skip") {
        skippedExisting++;
        continue;
      }
      // overwrite: 기존 파일 덮어쓰기
      const newContent = renderQuestionFile(extractQidFromName(conflict.name) ?? `Q${pad(nextQid, 3)}`, q, validation, meta, sourceId, input.structureModel);
      await app.vault.modify(conflict, newContent);
      written.push(conflict.path);
      continue;
    }

    const qid = `Q${pad(nextQid++, 3)}`;
    const fileName = `${qid}.md`;
    const filePath = joinPath(structuredDir, fileName);
    const newContent = renderQuestionFile(qid, q, validation, meta, sourceId, input.structureModel);
    await app.vault.create(filePath, newContent);
    written.push(filePath);
  }

  return {
    rawFile: input.rawFile,
    written,
    skippedExisting,
    invalid,
    total: parsed.length,
  };
}

function buildUserMessage(body: string, meta: RawMeta): string {
  return `다음 raw OCR 결과를 표준 포맷으로 변환하세요. 한 입력에 여러 문제가 있으면 각각 독립된 \`### Q{n}\` 블록으로 출력. 원본에 없는 내용은 만들지 말고, 누락 시 \`?\` 또는 \`[원본 누락]\`로 표기.

[source_page] ${meta.sourcePage}

[raw_md]
${body}
`;
}

function renderQuestionFile(
  qid: string,
  q: ParsedQuestion,
  validation: ValidationResult,
  meta: RawMeta,
  sourceId: string,
  modelVersion: string
): string {
  const reviewStatus = validation.warnings.length > 0 ? "needs_human" : "auto";
  const lines: string[] = [];
  lines.push("---");
  lines.push(`qid: ${qid}`);
  lines.push(`source_id: ${sourceId}`);
  lines.push(`source_page: ${meta.sourcePage}`);
  lines.push(`difficulty: "?"`);
  lines.push(`subject_code: "?"`);
  lines.push(`extraction_confidence: ${meta.extractionConfidence ?? 1.0}`);
  lines.push(`structuring:`);
  lines.push(`  model_version: ${modelVersion}`);
  lines.push(`  structured_at: ${todayIsoDate()}`);
  lines.push(`  warnings: [${validation.warnings.map((w) => JSON.stringify(w)).join(", ")}]`);
  lines.push(`review_status: ${reviewStatus}`);
  lines.push("---");
  lines.push("");
  lines.push(`### ${qid}`);
  lines.push(q.stem);
  lines.push("");
  for (let i = 0; i < q.choices.length; i++) {
    lines.push(`#### ${i + 1}) ${q.choices[i]}`);
  }
  lines.push("");
  lines.push(`##### 정답: ${q.answer}`);
  lines.push("");
  lines.push(`###### 해설: ${q.explanation || "[해설 누락]"}`);
  lines.push("");
  return lines.join("\n");
}

function extractQidFromName(name: string): string | null {
  const m = name.match(/^(Q\d{3,})\.md$/i);
  return m ? m[1] : null;
}

async function currentMaxQid(app: App, structuredDir: string): Promise<number> {
  const folder = app.vault.getAbstractFileByPath(structuredDir);
  if (!(folder instanceof TFolder)) return 0;
  let max = 0;
  for (const child of folder.children) {
    if (!(child instanceof TFile)) continue;
    const m = child.name.match(/^Q(\d{3,})\.md$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

async function findConflictByPageAndStem(
  app: App,
  structuredDir: string,
  sourcePage: number,
  stem: string
): Promise<TFile | null> {
  const folder = app.vault.getAbstractFileByPath(structuredDir);
  if (!(folder instanceof TFolder)) return null;
  const stemHead = stem.slice(0, 30).trim();
  if (!stemHead) return null;
  for (const child of folder.children) {
    if (!(child instanceof TFile)) continue;
    if (!child.name.match(/^Q\d{3,}\.md$/i)) continue;
    const text = await app.vault.read(child);
    const pageMatch = text.match(/^source_page:\s*(\d+)/m);
    const filePage = pageMatch ? parseInt(pageMatch[1], 10) : -1;
    if (filePage !== sourcePage) continue;
    if (text.includes(stemHead)) return child;
  }
  return null;
}

async function appendReviewLog(
  app: App,
  certRoot: string,
  sourceId: string,
  sourcePage: number,
  q: ParsedQuestion,
  validation: ValidationResult
): Promise<void> {
  const reviewDir = joinPath(certRoot, "_review");
  await ensureFolderRecursive(app, reviewDir);
  const path = joinPath(reviewDir, "structure_errors.md");
  const entry = [
    "",
    `## ${sourceId} · p${sourcePage} · ${todayIsoDate()}`,
    `- errors: ${validation.errors.join(" / ")}`,
    `- warnings: ${validation.warnings.join(" / ") || "-"}`,
    "",
    "```",
    q.rawBlock,
    "```",
    "",
  ].join("\n");

  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    const cur = await app.vault.read(existing);
    await app.vault.modify(existing, cur + entry);
  } else {
    await app.vault.create(
      path,
      `# 구조화 검증 실패 로그\n\n자동 검증에서 실패한 항목들이 누적됩니다. 수정 후 \`Q{nnn}.md\`로 직접 옮기거나 raw를 다시 OCR 후 재시도하세요.\n${entry}`
    );
  }
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  if (app.vault.getAbstractFileByPath(path)) return;
  const parent = path.split("/").slice(0, -1).join("/");
  if (parent) await ensureFolderRecursive(app, parent);
  await app.vault.createFolder(path);
}
