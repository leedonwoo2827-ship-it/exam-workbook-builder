import { App, TFile } from "obsidian";
import { TEMPLATES } from "../embedded";
import { joinPath, todayIsoDate } from "../utils";

/**
 * `04_concepts/{conceptName}.md` 허브 파일을 보장한다 (없으면 템플릿으로 생성).
 * 그리고 "## 이 개념을 다루는 문제" 섹션에 `- [[Q###]]` 한 줄을 멱등 추가한다.
 *
 * candidate:접두어가 붙은 개념은 별도 폴더 `_candidates/`에 만들어 사람의 승인을 받게 한다.
 */
export async function upsertConceptHub(
  app: App,
  certRoot: string,
  conceptRaw: string,
  qid: string,
  meta?: { subjectCode?: string; topicTag?: string }
): Promise<string> {
  const isCandidate = conceptRaw.startsWith("candidate:");
  const conceptName = isCandidate ? conceptRaw.slice("candidate:".length) : conceptRaw;
  if (!conceptName.trim()) throw new Error("빈 concept");

  const safeName = sanitizeFileName(conceptName);
  const subDir = isCandidate ? "_candidates" : "";
  const dir = joinPath(certRoot, "04_concepts", subDir);
  await ensureFolderRecursive(app, dir);
  const path = joinPath(dir, `${safeName}.md`);

  let file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    const initial = renderConceptStub(conceptName, meta);
    await app.vault.create(path, initial);
    file = app.vault.getAbstractFileByPath(path);
  }
  if (!(file instanceof TFile)) {
    throw new Error(`개념 허브 생성 실패: ${path}`);
  }

  const existing = await app.vault.read(file);
  const updated = appendQuestionLink(existing, qid);
  if (updated !== existing) await app.vault.modify(file, updated);
  return path;
}

function renderConceptStub(
  conceptName: string,
  meta?: { subjectCode?: string; topicTag?: string }
): string {
  const tpl = TEMPLATES.concept;
  return tpl
    .replace(/^---\nconcept_id: ""/m, `---\nconcept_id: "${conceptName}"`)
    .replace(/cert: "SQLD\|COMP1\|ENGINEER"/, `cert: "${meta?.subjectCode ? "" : ""}"`)
    .replace(/subject_code: "S1"\s*#[^\n]*/, `subject_code: "${meta?.subjectCode ?? "?"}"`)
    .replace(/parent_topic: ""/, `parent_topic: "${meta?.topicTag ?? ""}"`)
    .replace(/^# \{개념명\}/m, `# ${conceptName}`)
    .replace(/^- 2026-04-24:.*/m, `- ${todayIsoDate()}: 자동 생성 (M3 태깅)`);
}

function appendQuestionLink(content: string, qid: string): string {
  const link = `- [[${qid}]]`;
  // 이미 있으면 그대로 반환
  if (new RegExp(`^${escapeRegExp(link)}\\s*$`, "m").test(content)) return content;

  const sectionRe = /^##\s*이 개념을 다루는 문제[^\n]*\n/m;
  const m = content.match(sectionRe);
  if (!m) {
    // 섹션이 없으면 끝에 추가
    return content.trimEnd() + "\n\n## 이 개념을 다루는 문제\n" + link + "\n";
  }
  const insertAt = (m.index as number) + m[0].length;
  // 다음 ## 섹션 직전까지가 본 섹션 영역
  const tail = content.slice(insertAt);
  const nextSectionRel = tail.search(/^##\s/m);
  const sectionEnd = nextSectionRel === -1 ? content.length : insertAt + nextSectionRel;
  const before = content.slice(0, sectionEnd);
  const after = content.slice(sectionEnd);
  // before 안에서 마지막 비어있지 않은 줄 다음에 삽입
  const beforeTrimmed = before.replace(/\s+$/, "");
  return beforeTrimmed + "\n" + link + "\n\n" + after.replace(/^\n+/, "");
}

function sanitizeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureFolderRecursive(app: App, path: string): Promise<void> {
  if (!path) return;
  if (app.vault.getAbstractFileByPath(path)) return;
  const parent = path.split("/").slice(0, -1).join("/");
  if (parent) await ensureFolderRecursive(app, parent);
  await app.vault.createFolder(path);
}
