import { App, TFile, TFolder } from "obsidian";
import { ocrPage } from "./ocrPage";

export interface OcrFolderInput {
  folder: TFolder;             // 01_원본/{sourceId}/pages/ 또는 01_원본/{sourceId}/
  ollamaUrl: string;
  visionModel: string;
  timeoutMs: number;
  confidenceThreshold: number;
  onProgress?: (done: number, total: number, currentFile: string) => void;
  /** 이미 raw.md가 있는 페이지는 스킵. 기본 true. */
  skipExisting?: boolean;
}

export interface OcrFolderSummary {
  totalPages: number;
  processed: number;
  skipped: number;
  failed: { path: string; error: string }[];
}

export async function ocrFolder(app: App, input: OcrFolderInput): Promise<OcrFolderSummary> {
  const pageFiles = collectPageFiles(input.folder);
  const skipExisting = input.skipExisting ?? true;

  const summary: OcrFolderSummary = {
    totalPages: pageFiles.length,
    processed: 0,
    skipped: 0,
    failed: [],
  };

  for (let i = 0; i < pageFiles.length; i++) {
    const f = pageFiles[i];
    input.onProgress?.(i, pageFiles.length, f.name);

    if (skipExisting && existsRawFor(app, f.path)) {
      summary.skipped++;
      continue;
    }

    try {
      await ocrPage(app, {
        imageFile: f,
        ollamaUrl: input.ollamaUrl,
        visionModel: input.visionModel,
        timeoutMs: input.timeoutMs,
        confidenceThreshold: input.confidenceThreshold,
      });
      summary.processed++;
    } catch (e) {
      summary.failed.push({ path: f.path, error: (e as Error).message });
    }
  }
  input.onProgress?.(pageFiles.length, pageFiles.length, "done");
  return summary;
}

function collectPageFiles(folder: TFolder): TFile[] {
  // 두 가지 입력을 다룬다:
  //  1) 01_원본/{sourceId}/pages/   — 자식이 모두 png
  //  2) 01_원본/{sourceId}/         — 자식 중 'pages/'를 찾아 그 아래의 png
  const direct: TFile[] = [];
  let pagesChild: TFolder | null = null;
  for (const c of folder.children) {
    if (c instanceof TFile && c.extension.toLowerCase() === "png") direct.push(c);
    else if (c instanceof TFolder && c.name === "pages") pagesChild = c;
  }
  if (direct.length > 0) {
    direct.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return direct;
  }
  if (pagesChild) {
    const out: TFile[] = [];
    for (const c of pagesChild.children) {
      if (c instanceof TFile && c.extension.toLowerCase() === "png") out.push(c);
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return out;
  }
  return [];
}

function existsRawFor(app: App, pngPath: string): boolean {
  const parts = pngPath.split("/");
  const fileName = parts[parts.length - 1];
  const baseName = fileName.replace(/\.png$/i, "");
  const idx = parts.findIndex((p) => p === "01_원본");
  if (idx === -1 || idx + 1 >= parts.length) return false;
  const sourceId = parts[idx + 1];
  const before = parts.slice(0, idx).join("/");
  const rawPath = `${before}/02_raw/${sourceId}/${baseName}.raw.md`;
  return !!app.vault.getAbstractFileByPath(rawPath);
}

/** TFolder가 OCR 일괄 대상인지 판별. */
export function isOcrTargetFolder(folder: TFolder): boolean {
  // pages/ 자체이거나, 안에 pages/ 또는 png들을 가진 source 폴더
  if (folder.name === "pages") return true;
  // 직접 png를 가진 폴더
  for (const c of folder.children) {
    if (c instanceof TFile && c.extension.toLowerCase() === "png") return true;
    if (c instanceof TFolder && c.name === "pages") return true;
  }
  return false;
}

/** 부모 경로에 01_원본이 있어야 OCR target으로 인정 (다른 폴더 우클릭 오작동 방지). */
export function isUnderOriginal(folder: TFolder): boolean {
  return folder.path.split("/").includes("01_원본");
}
