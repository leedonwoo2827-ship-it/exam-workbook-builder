import { App, Notice, TFile } from "obsidian";
import { generateText } from "../ollama";
import { PROMPTS } from "../embedded";
import { arrayBufferToBase64, joinPath, todayIsoDate } from "../utils";

export interface OcrPageInput {
  imageFile: TFile;            // .png 페이지 이미지
  ollamaUrl: string;
  visionModel: string;
  timeoutMs: number;
  confidenceThreshold: number;
}

export interface OcrPageResult {
  outputPath: string;
  rawLength: number;
}

export async function ocrPage(app: App, input: OcrPageInput): Promise<OcrPageResult> {
  if (!input.imageFile.path.toLowerCase().endsWith(".png")) {
    throw new Error("png 파일만 지원합니다. PDF를 먼저 Import PDF 명령으로 페이지 분할하세요.");
  }

  const bytes = await app.vault.readBinary(input.imageFile);
  const base64 = arrayBufferToBase64(bytes);

  const pageNumMatch = input.imageFile.name.match(/p(\d{3,5})\.png$/i);
  const pageNum = pageNumMatch ? parseInt(pageNumMatch[1], 10) : 0;

  const userMessage = `다음은 자격증 교재 페이지 이미지입니다 (페이지 ${pageNum || "?"}). 위 규칙에 따라 추출하세요.`;

  const response = await generateText({
    url: input.ollamaUrl,
    model: input.visionModel,
    system: PROMPTS.ocrVision,
    prompt: userMessage,
    images: [base64],
    temperature: 0.2,
    timeoutMs: input.timeoutMs,
  });

  const raw = response.trim();
  const frontmatter = buildFrontmatter({
    sourcePage: pageNum,
    sourceImage: input.imageFile.path,
    model: input.visionModel,
    ocredAt: todayIsoDate(),
  });

  const body = stripDuplicateFrontmatter(raw);
  const output = `${frontmatter}\n\n${body}\n`;

  const outDir = deriveRawDir(input.imageFile.path);
  const outName = input.imageFile.basename + ".raw.md";
  const outputPath = joinPath(outDir, outName);

  await writeFile(app, outputPath, output);
  return { outputPath, rawLength: output.length };
}

function buildFrontmatter(meta: {
  sourcePage: number;
  sourceImage: string;
  model: string;
  ocredAt: string;
}): string {
  return [
    "---",
    `source_page: ${meta.sourcePage}`,
    `source_image: ${meta.sourceImage}`,
    `ocr_model: ${meta.model}`,
    `ocred_at: ${meta.ocredAt}`,
    "---",
  ].join("\n");
}

function stripDuplicateFrontmatter(raw: string): string {
  const m = raw.match(/^---\n[\s\S]*?\n---\n?/);
  if (m) return raw.slice(m[0].length).trimStart();
  return raw;
}

/**
 * 이미지 경로가 `{root}/{cert}/01_원본/{sourceId}/pages/p0001.png`이면
 * raw 출력 경로는 `{root}/{cert}/02_raw/{sourceId}/p0001.raw.md`.
 * 추론 실패 시 이미지와 같은 폴더에 저장 fallback.
 */
function deriveRawDir(imagePath: string): string {
  const parts = imagePath.split("/");
  const idx = parts.findIndex((p) => p === "01_원본");
  if (idx === -1 || idx + 2 >= parts.length) {
    return parts.slice(0, -1).join("/");
  }
  const sourceId = parts[idx + 1];
  const before = parts.slice(0, idx).join("/");
  return joinPath(before, "02_raw", sourceId);
}

async function writeFile(app: App, path: string, content: string): Promise<void> {
  const dir = path.split("/").slice(0, -1).join("/");
  await ensureFolderRecursive(app, dir);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(path, content);
  }
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  if (app.vault.getAbstractFileByPath(path)) return;
  const parent = path.split("/").slice(0, -1).join("/");
  if (parent) await ensureFolderRecursive(app, parent);
  await app.vault.createFolder(path);
}
