import { App, TFile, TFolder } from "obsidian";
import { joinPath, todayIsoDate } from "../utils";

export interface WorkspaceStatus {
  certRoot: string;
  certCode: string;
  hasSubjectYaml: boolean;
  hasOverview: boolean;
  pdfs: number;
  sourceIds: number;
  pageImages: number;
  rawMd: number;
  structuredQ: number;
  taggedQ: number;
  candidatesPending: number;
  conceptHubs: number;
  references: number;
  rounds: number;
  totalRoundQuestions: number;
  exports: number;
  reviewQueue: number;
  reportPath: string;
}

export async function buildWorkspaceStatus(app: App, certRoot: string): Promise<WorkspaceStatus> {
  const certCode = certRoot.split("/").slice(-1)[0];
  const status: WorkspaceStatus = {
    certRoot,
    certCode,
    hasSubjectYaml: !!app.vault.getAbstractFileByPath(joinPath(certRoot, "subject.yaml")),
    hasOverview: !!app.vault.getAbstractFileByPath(joinPath(certRoot, "00_시험개요.md")),
    pdfs: 0,
    sourceIds: 0,
    pageImages: 0,
    rawMd: 0,
    structuredQ: 0,
    taggedQ: 0,
    candidatesPending: 0,
    conceptHubs: 0,
    references: 0,
    rounds: 0,
    totalRoundQuestions: 0,
    exports: 0,
    reviewQueue: 0,
    reportPath: "",
  };

  const sourceRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "01_원본"));
  if (sourceRoot instanceof TFolder) {
    for (const child of sourceRoot.children) {
      if (child instanceof TFolder) {
        status.sourceIds++;
        for (const c of child.children) {
          if (c instanceof TFile && c.extension.toLowerCase() === "pdf") status.pdfs++;
          if (c instanceof TFolder && c.name === "pages") {
            for (const p of c.children) {
              if (p instanceof TFile && p.extension.toLowerCase() === "png") status.pageImages++;
            }
          }
        }
      }
    }
  }

  const rawRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "02_raw"));
  if (rawRoot instanceof TFolder) {
    await walkCount(rawRoot, (f) => {
      if (f.name.endsWith(".raw.md")) status.rawMd++;
    });
  }

  const structuredRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "03_structured"));
  if (structuredRoot instanceof TFolder) {
    await walkRead(app, structuredRoot, async (f) => {
      if (!/^Q\d{3,}\.md$/i.test(f.name)) return;
      status.structuredQ++;
      const text = await app.vault.read(f);
      if (/^primary_concept:\s*\S/m.test(text)) status.taggedQ++;
    });
  }

  const conceptsRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "04_concepts"));
  if (conceptsRoot instanceof TFolder) {
    for (const child of conceptsRoot.children) {
      if (child instanceof TFile && child.extension === "md") status.conceptHubs++;
      if (child instanceof TFolder && child.name === "_candidates") {
        for (const c of child.children) {
          if (c instanceof TFile && c.extension === "md") status.candidatesPending++;
        }
      }
    }
  }

  const refRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "00_참고자료"));
  if (refRoot instanceof TFolder) {
    await walkCount(refRoot, (f) => {
      if (f.extension === "md" && /^R[-_]/i.test(f.name)) status.references++;
    });
  }

  const roundsRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "05_rounds"));
  if (roundsRoot instanceof TFolder) {
    for (const child of roundsRoot.children) {
      if (child instanceof TFolder) {
        status.rounds++;
        for (const c of child.children) {
          if (c instanceof TFile && /^Q\d+\.md$/i.test(c.name)) status.totalRoundQuestions++;
        }
      }
    }
  }

  const outputRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "06_output"));
  if (outputRoot instanceof TFolder) {
    for (const child of outputRoot.children) {
      if (child instanceof TFolder) status.exports++;
    }
  }

  const reviewRoot = app.vault.getAbstractFileByPath(joinPath(certRoot, "_review"));
  if (reviewRoot instanceof TFolder) {
    for (const c of reviewRoot.children) {
      if (c instanceof TFile && c.extension === "md") status.reviewQueue++;
    }
  }

  status.reportPath = joinPath(certRoot, "_review", "workspace_status.md");
  await writeFile(app, status.reportPath, renderReport(status));
  return status;
}

function renderReport(s: WorkspaceStatus): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`cert: "${s.certCode}"`);
  lines.push(`generated_at: "${todayIsoDate()}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${s.certCode} 워크스페이스 진단`);
  lines.push("");
  lines.push("## 메타");
  lines.push(`- cert root: \`${s.certRoot}\``);
  lines.push(`- subject.yaml: ${s.hasSubjectYaml ? "✅" : "❌ (먼저 작성 필요)"}`);
  lines.push(`- 00_시험개요.md: ${s.hasOverview ? "✅" : "⚠️ (선택)"}`);
  lines.push("");
  lines.push("## 단계별 진척");
  lines.push("| 단계 | 항목 | 수량 |");
  lines.push("|---|---|---:|");
  lines.push(`| M1 입력 | 원본 PDF (sourceIds × pdfs) | ${s.sourceIds} × ${s.pdfs} |`);
  lines.push(`| M1 입력 | 페이지 이미지 (PNG) | ${s.pageImages} |`);
  lines.push(`| M1 출력 | raw.md | ${s.rawMd} |`);
  lines.push(`| M2 출력 | 표준 Q.md | ${s.structuredQ} |`);
  lines.push(`| M3 진척 | 태깅 완료 Q | ${s.taggedQ} / ${s.structuredQ} |`);
  lines.push(`| M3 출력 | 개념 허브 노드 | ${s.conceptHubs} |`);
  lines.push(`| M3 검토 | 후보 개념 (_candidates/) | ${s.candidatesPending} |`);
  lines.push(`| 참고자료 | 00_참고자료/R-*.md | ${s.references} |`);
  lines.push(`| M4 출력 | 회차 / 회차 내 총 Q수 | ${s.rounds} / ${s.totalRoundQuestions} |`);
  lines.push(`| M5 출력 | 06_output/ 폴더수 | ${s.exports} |`);
  lines.push(`| 검토 큐 | _review/*.md | ${s.reviewQueue} |`);
  lines.push("");
  lines.push("## 다음 단계 추천");
  lines.push(suggestion(s));
  lines.push("");
  lines.push("> 이 리포트는 `워크스페이스 진단` 명령으로 재생성됩니다 (덮어쓰기).");
  return lines.join("\n");
}

function suggestion(s: WorkspaceStatus): string {
  if (!s.hasSubjectYaml) return "- ❗ `subject.yaml`을 먼저 작성하세요 (concept 화이트리스트 기반으로 모든 단계가 동작).";
  if (s.pageImages === 0 && s.pdfs === 0) return "- 다음 단계: **PDF 가져오기**로 원본 교재를 임포트.";
  if (s.pageImages > 0 && s.rawMd < s.pageImages) {
    return `- 다음 단계: 미처리 페이지 ${s.pageImages - s.rawMd}장에 대해 **OCR 일괄 실행** (\`01_원본/{sourceId}/\` 폴더 우클릭).`;
  }
  if (s.rawMd > 0 && s.structuredQ === 0) {
    return "- 다음 단계: `02_raw/{sourceId}/` 폴더 우클릭 → **이 source 일괄 구조화**.";
  }
  if (s.structuredQ > s.taggedQ) {
    return `- 다음 단계: 미태깅 ${s.structuredQ - s.taggedQ}건에 대해 **개념 태깅 일괄 실행** (\`03_structured/{sourceId}/\` 폴더 우클릭).`;
  }
  if (s.taggedQ >= 30 && s.rounds === 0) {
    return "- 다음 단계: cert 루트 폴더 우클릭 → **이 워크스페이스에 회차 생성**.";
  }
  if (s.rounds > 0 && s.exports < s.rounds) {
    return `- 다음 단계: 미export 회차 ${s.rounds - s.exports}건에 대해 **회차 export** 실행.`;
  }
  return "- 모든 단계가 진행되었습니다. 새 회차를 생성하거나 참고자료(`00_참고자료/`)를 보강하세요.";
}

async function walkCount(folder: TFolder, hit: (f: TFile) => void): Promise<void> {
  for (const c of folder.children) {
    if (c instanceof TFile) hit(c);
    else if (c instanceof TFolder) await walkCount(c, hit);
  }
}

async function walkRead(app: App, folder: TFolder, hit: (f: TFile) => Promise<void>): Promise<void> {
  for (const c of folder.children) {
    if (c instanceof TFile) await hit(c);
    else if (c instanceof TFolder) await walkRead(app, c, hit);
  }
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

