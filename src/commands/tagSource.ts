import { App, TFile, TFolder } from "obsidian";
import { tagQuestion } from "./tagQuestion";
import { parseSubjectYaml, SubjectConfig } from "../concepts/parseSubjectYaml";

export interface TagSourceInput {
  sourceFolder: TFolder;        // 03_structured/{sourceId}
  ollamaUrl: string;
  reasoningModel: string;
  timeoutMs: number;
  onProgress?: (done: number, total: number, currentFile: string) => void;
  /** 이미 태깅된(primary_concept이 있는) 파일은 건너뛸지. 기본 true. */
  skipTagged?: boolean;
}

export interface TagSourceSummary {
  totalFiles: number;
  processed: number;
  skipped: number;
  failed: { path: string; error: string }[];
  candidateConcepts: number;
  hubsTouched: number;
}

export async function tagSource(app: App, input: TagSourceInput): Promise<TagSourceSummary> {
  const certRoot = inferCertRootFromStructuredFolder(input.sourceFolder.path);
  if (!certRoot) throw new Error("cert root 추정 실패. 03_structured/{sourceId}/ 폴더에서 실행하세요.");
  const subject = await loadSubject(app, certRoot);

  const qFiles: TFile[] = [];
  for (const child of input.sourceFolder.children) {
    if (child instanceof TFile && /^Q\d{3,}\.md$/i.test(child.name)) qFiles.push(child);
  }
  qFiles.sort((a, b) => a.name.localeCompare(b.name));

  const skipTagged = input.skipTagged ?? true;
  const summary: TagSourceSummary = {
    totalFiles: qFiles.length,
    processed: 0,
    skipped: 0,
    failed: [],
    candidateConcepts: 0,
    hubsTouched: 0,
  };

  for (let i = 0; i < qFiles.length; i++) {
    const f = qFiles[i];
    input.onProgress?.(i, qFiles.length, f.name);
    try {
      if (skipTagged && (await alreadyTagged(app, f))) {
        summary.skipped++;
        continue;
      }
      const r = await tagQuestion(app, {
        questionFile: f,
        ollamaUrl: input.ollamaUrl,
        reasoningModel: input.reasoningModel,
        timeoutMs: input.timeoutMs,
        subject,
        certRoot,
      });
      summary.processed++;
      summary.candidateConcepts += r.candidateCount;
      summary.hubsTouched += r.hubsTouched.length;
    } catch (e) {
      summary.failed.push({ path: f.path, error: (e as Error).message });
    }
  }
  input.onProgress?.(qFiles.length, qFiles.length, "done");
  return summary;
}

async function alreadyTagged(app: App, file: TFile): Promise<boolean> {
  const text = await app.vault.read(file);
  return /^primary_concept:\s*\S/m.test(text);
}

async function loadSubject(app: App, certRoot: string): Promise<SubjectConfig> {
  const path = certRoot + "/subject.yaml";
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`subject.yaml을 찾지 못했습니다: ${path}`);
  const yaml = await app.vault.read(f);
  return parseSubjectYaml(yaml);
}

function inferCertRootFromStructuredFolder(folderPath: string): string | null {
  const parts = folderPath.split("/");
  const idx = parts.findIndex((p) => p === "03_structured");
  if (idx <= 0) return null;
  return parts.slice(0, idx).join("/");
}
