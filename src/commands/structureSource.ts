import { App, TFile, TFolder } from "obsidian";
import { structureRaw } from "./structureRaw";

export interface StructureSourceInput {
  sourceFolder: TFolder;     // 02_raw/{sourceId}
  ollamaUrl: string;
  structureModel: string;
  timeoutMs: number;
  onProgress?: (done: number, total: number, currentFile: string) => void;
}

export interface StructureSourceSummary {
  totalFiles: number;
  processedFiles: number;
  failedFiles: { path: string; error: string }[];
  totalQuestionsExtracted: number;
  totalQuestionsWritten: number;
  totalSkipped: number;
  totalInvalid: number;
}

export async function structureSource(app: App, input: StructureSourceInput): Promise<StructureSourceSummary> {
  const rawFiles: TFile[] = [];
  for (const child of input.sourceFolder.children) {
    if (child instanceof TFile && child.name.endsWith(".raw.md")) {
      rawFiles.push(child);
    }
  }
  rawFiles.sort((a, b) => a.name.localeCompare(b.name));

  const summary: StructureSourceSummary = {
    totalFiles: rawFiles.length,
    processedFiles: 0,
    failedFiles: [],
    totalQuestionsExtracted: 0,
    totalQuestionsWritten: 0,
    totalSkipped: 0,
    totalInvalid: 0,
  };

  for (let i = 0; i < rawFiles.length; i++) {
    const f = rawFiles[i];
    input.onProgress?.(i, rawFiles.length, f.name);
    try {
      const r = await structureRaw(app, {
        rawFile: f,
        ollamaUrl: input.ollamaUrl,
        structureModel: input.structureModel,
        timeoutMs: input.timeoutMs,
        onConflict: "skip",
      });
      summary.processedFiles++;
      summary.totalQuestionsExtracted += r.total;
      summary.totalQuestionsWritten += r.written.length;
      summary.totalSkipped += r.skippedExisting;
      summary.totalInvalid += r.invalid;
    } catch (e) {
      summary.failedFiles.push({ path: f.path, error: (e as Error).message });
    }
  }
  input.onProgress?.(rawFiles.length, rawFiles.length, "done");
  return summary;
}

/** TFolder 경로가 02_raw/{sourceId}/ 형태인지 판별. */
export function isRawSourceFolder(folder: TFolder): boolean {
  const parts = folder.path.split("/");
  return parts.length >= 2 && parts[parts.length - 2] === "02_raw";
}
