import { App, Modal, Notice, Setting, TFile, TFolder } from "obsidian";
import { generateText } from "../ollama";
import { PROMPTS } from "../embedded";
import { joinPath, pad, todayIsoDate } from "../utils";
import {
  flattenConcepts,
  parseSubjectYaml,
  SubjectConfig,
} from "../concepts/parseSubjectYaml";
import {
  loadReferences,
  pickReferencesForConcepts,
  ReferenceNote,
  renderReferencePack,
} from "../round/referencePicker";
import { planRound, SlotPlan } from "../round/sampler";
import { measureOverlap } from "../round/copyrightCheck";
import { ParsedQuestion, parseStructuredOutput } from "../structure/parseModel";
import { validateQuestion } from "../structure/validate";

export interface GenerateRoundInput {
  certRoot: string;
  certCode: string;
  roundId: string;             // 예: 2026-1회
  totalQuestions: number;      // 총 문제 수
  ollamaUrl: string;
  reasoningModel: string;
  timeoutMs: number;
  similarityThreshold: number; // 5-gram 겹침 임계 (0~1)
  maxConsecutiveRun: number;   // 연속 단어 일치 최대치
  retryPerSlot: number;        // 슬롯당 재시도 횟수
  onProgress?: (done: number, total: number, msg: string) => void;
}

export interface GenerateRoundResult {
  roundDir: string;
  totalSlots: number;
  written: number;
  retriedSlots: number;
  failedSlots: { index: number; reason: string }[];
}

export async function generateRound(app: App, input: GenerateRoundInput): Promise<GenerateRoundResult> {
  const subject = await loadSubject(app, input.certRoot);
  const whitelist = new Set(flattenConcepts(subject));
  if (whitelist.size === 0) throw new Error("subject.yaml의 concept 화이트리스트가 비어있습니다.");

  const refs = await loadReferences(app, input.certRoot);
  const corpus = await loadOriginalCorpus(app, input.certRoot);

  const slots = planRound({
    subject,
    totalQuestions: input.totalQuestions,
    seed: `${input.certCode}_${input.roundId}`,
  });

  const roundDir = joinPath(input.certRoot, "05_rounds", input.roundId);
  await ensureFolderRecursive(app, roundDir);

  const result: GenerateRoundResult = {
    roundDir,
    totalSlots: slots.length,
    written: 0,
    retriedSlots: 0,
    failedSlots: [],
  };

  const writtenQids: { qid: string; filePath: string; slot: SlotPlan }[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    input.onProgress?.(i, slots.length, `Q${pad(slot.index, 2)} · ${slot.subjectCode} · ${slot.primaryConcept}`);

    const conceptSet = new Set([slot.primaryConcept]);
    const pickedRefs = pickReferencesForConcepts(refs, conceptSet, 3);
    const usedNgramSamples = writtenQids.length > 0 ? await sampleRecentNgrams(app, writtenQids.slice(-5)) : "";

    let succeeded = false;
    for (let attempt = 0; attempt <= input.retryPerSlot; attempt++) {
      const userMsg = buildUserMessage({
        certCode: input.certCode,
        slot,
        roundId: input.roundId,
        refs: pickedRefs,
        recentNgrams: usedNgramSamples,
      });
      const raw = await generateText({
        url: input.ollamaUrl,
        model: input.reasoningModel,
        system: PROMPTS.generate,
        prompt: userMsg,
        temperature: attempt === 0 ? 0.7 : 0.85,
        timeoutMs: input.timeoutMs,
      });
      const parsed = parseStructuredOutput(raw);
      if (parsed.length === 0) continue;
      const q = parsed[0];
      const validation = validateQuestion(q);
      if (!validation.passed) continue;

      const overlap = measureOverlap(renderForOverlap(q), corpus, 5);
      const fail =
        overlap.ratio > input.similarityThreshold ||
        overlap.longestRunWords > input.maxConsecutiveRun;
      if (fail) {
        if (attempt < input.retryPerSlot) result.retriedSlots++;
        continue;
      }

      const qid = `Q${pad(slot.index, 2)}`;
      const filePath = joinPath(roundDir, `${qid}.md`);
      await writeFile(
        app,
        filePath,
        renderQuestionFile({
          qid,
          slot,
          q,
          roundId: input.roundId,
          certCode: input.certCode,
          model: input.reasoningModel,
          refsUsed: pickedRefs.map((r) => r.refId),
          overlap: { ratio: overlap.ratio, longestRun: overlap.longestRunWords },
        })
      );
      writtenQids.push({ qid, filePath, slot });
      result.written++;
      succeeded = true;
      break;
    }
    if (!succeeded) {
      result.failedSlots.push({
        index: slot.index,
        reason: "재시도 한도 내에서 검증/저작권 검사 통과 실패",
      });
    }
  }

  // 회차 인덱스/답안지
  await writeFile(app, joinPath(roundDir, "index.md"), renderRoundIndex({
    roundId: input.roundId,
    certCode: input.certCode,
    items: writtenQids,
    seed: `${input.certCode}_${input.roundId}`,
  }));
  await writeFile(app, joinPath(roundDir, "answers.md"), await renderAnswerSheet(app, writtenQids));

  input.onProgress?.(slots.length, slots.length, "done");
  return result;
}

interface UserMessageInput {
  certCode: string;
  slot: SlotPlan;
  roundId: string;
  refs: ReferenceNote[];
  recentNgrams: string;
}

function buildUserMessage(i: UserMessageInput): string {
  const refPack = renderReferencePack(i.refs);
  return `다음 조건으로 새 문제 1건 생성. 출력은 \`### Q{n}\` 포맷의 단일 markdown 블록.

[자격증] ${i.certCode}
[과목] ${i.slot.subjectCode}
[난이도] ${i.slot.difficulty}
[주 개념] ${i.slot.primaryConcept}
[회차] ${i.roundId}

[참고자료]
${refPack}

[직전에 생성한 문제들에서 발췌한 5-gram (중복 회피용 — 동일 문구 사용 금지)]
${i.recentNgrams || "(없음)"}

[출력 양식]
### Q1
<발문>

#### 1) <선택지1>
#### 2) <선택지2>
#### 3) <선택지3>
#### 4) <선택지4>

##### 정답: <1~4>

###### 해설: <왜 정답이고 오답이 왜 틀렸는지 + [[${i.slot.primaryConcept}]] 백링크 포함>
`;
}

function renderForOverlap(q: ParsedQuestion): string {
  return [q.stem, ...q.choices, q.explanation].join("\n");
}

function renderQuestionFile(p: {
  qid: string;
  slot: SlotPlan;
  q: ParsedQuestion;
  roundId: string;
  certCode: string;
  model: string;
  refsUsed: string[];
  overlap: { ratio: number; longestRun: number };
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`qid: ${p.qid}`);
  lines.push(`round_id: "${p.roundId}"`);
  lines.push(`cert: "${p.certCode.toUpperCase()}"`);
  lines.push(`subject_code: ${p.slot.subjectCode}`);
  lines.push(`difficulty: ${p.slot.difficulty}`);
  lines.push("concepts:");
  lines.push(`  - ${p.slot.primaryConcept}`);
  lines.push(`primary_concept: ${p.slot.primaryConcept}`);
  lines.push("generation:");
  lines.push(`  model_version: ${p.model}`);
  lines.push(`  generated_at: ${todayIsoDate()}`);
  lines.push(`  references_used: [${p.refsUsed.map((r) => JSON.stringify(r)).join(", ")}]`);
  lines.push("copyright_check:");
  lines.push(`  max_5gram_overlap_ratio: ${p.overlap.ratio.toFixed(3)}`);
  lines.push(`  longest_run_words: ${p.overlap.longestRun}`);
  lines.push(`  passed: true`);
  lines.push(`review_status: auto`);
  lines.push("---");
  lines.push("");
  lines.push(`### ${p.qid}`);
  lines.push(p.q.stem);
  lines.push("");
  for (let i = 0; i < p.q.choices.length; i++) {
    lines.push(`#### ${i + 1}) ${p.q.choices[i]}`);
  }
  lines.push("");
  lines.push(`##### 정답: ${p.q.answer}`);
  lines.push("");
  lines.push(`###### 해설: ${p.q.explanation}`);
  lines.push("");
  return lines.join("\n");
}

function renderRoundIndex(p: {
  roundId: string;
  certCode: string;
  items: { qid: string; slot: SlotPlan }[];
  seed: string;
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`round_id: "${p.roundId}"`);
  lines.push(`cert: "${p.certCode.toUpperCase()}"`);
  lines.push(`generated_at: "${todayIsoDate()}"`);
  lines.push(`seed: "${p.seed}"`);
  lines.push(`question_count: ${p.items.length}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${p.certCode.toUpperCase()} ${p.roundId} 모의고사`);
  lines.push("");
  lines.push(`> 시드: \`${p.seed}\` · 생성일: ${todayIsoDate()}`);
  lines.push("");
  lines.push("## 문제 목록");
  lines.push("| # | 과목 | 난이도 | 주 개념 | 링크 |");
  lines.push("|---|------|--------|---------|------|");
  for (const it of p.items) {
    lines.push(`| ${it.slot.index} | ${it.slot.subjectCode} | ${it.slot.difficulty} | ${it.slot.primaryConcept} | [[${it.qid}]] |`);
  }
  lines.push("");
  lines.push("## 답안지");
  lines.push("- [[answers]]");
  lines.push("");
  return lines.join("\n");
}

async function renderAnswerSheet(
  app: App,
  items: { qid: string; filePath: string; slot: SlotPlan }[]
): Promise<string> {
  const lines = ["# 답안지", ""];
  lines.push("| # | 정답 | 주 개념 |");
  lines.push("|---|------|---------|");
  for (const it of items) {
    const f = app.vault.getAbstractFileByPath(it.filePath);
    let answer = "?";
    if (f instanceof TFile) {
      const text = await app.vault.read(f);
      const m = text.match(/^#####\s*정답\s*[:：]?\s*(.+)$/m);
      if (m) answer = m[1].trim();
    }
    lines.push(`| ${it.slot.index} | ${answer} | ${it.slot.primaryConcept} |`);
  }
  return lines.join("\n") + "\n";
}

async function loadSubject(app: App, certRoot: string): Promise<SubjectConfig> {
  const path = joinPath(certRoot, "subject.yaml");
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`subject.yaml을 찾지 못했습니다: ${path}`);
  return parseSubjectYaml(await app.vault.read(f));
}

async function loadOriginalCorpus(app: App, certRoot: string): Promise<string> {
  const root = app.vault.getAbstractFileByPath(joinPath(certRoot, "03_structured"));
  if (!(root instanceof TFolder)) return "";
  const parts: string[] = [];
  await walkCollect(app, root, parts);
  return parts.join("\n");
}

async function walkCollect(app: App, folder: TFolder, parts: string[]): Promise<void> {
  for (const child of folder.children) {
    if (child instanceof TFolder) await walkCollect(app, child, parts);
    else if (child instanceof TFile && /^Q\d{3,}\.md$/i.test(child.name)) {
      const text = await app.vault.read(child);
      // frontmatter 제거
      const body = text.replace(/^---\n[\s\S]*?\n---\n?/, "");
      parts.push(body);
    }
  }
}

async function sampleRecentNgrams(
  app: App,
  recent: { qid: string; filePath: string }[]
): Promise<string> {
  const out: string[] = [];
  for (const r of recent) {
    const f = app.vault.getAbstractFileByPath(r.filePath);
    if (!(f instanceof TFile)) continue;
    const text = await app.vault.read(f);
    const stemMatch = text.match(/^###\s+Q[^\n]*\n([\s\S]*?)\n####/m);
    if (stemMatch) out.push(`- ${stemMatch[1].trim().slice(0, 80)}`);
  }
  return out.join("\n");
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

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────

export interface RoundFormInput {
  certRoot: string;
  certCode: string;
  roundId: string;
  totalQuestions: number;
  similarityThreshold: number;
  maxConsecutiveRun: number;
  retryPerSlot: number;
}

export class GenerateRoundModal extends Modal {
  private input: RoundFormInput;
  private onSubmit: (v: RoundFormInput) => void;

  constructor(app: App, defaults: RoundFormInput, onSubmit: (v: RoundFormInput) => void) {
    super(app);
    this.input = { ...defaults };
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ewb-modal");
    contentEl.createEl("h2", { text: "회차 생성 (M4)" });

    new Setting(contentEl).setName("cert root").setDesc(this.input.certRoot).setDisabled(true);

    new Setting(contentEl).setName("cert 코드").addText((t) =>
      t.setValue(this.input.certCode).onChange((v) => (this.input.certCode = v.trim()))
    );

    new Setting(contentEl)
      .setName("회차 ID")
      .setDesc("예: 2026-1회. 시드는 `{cert}_{roundId}`로 결정됩니다.")
      .addText((t) =>
        t.setValue(this.input.roundId).onChange((v) => (this.input.roundId = v.trim()))
      );

    new Setting(contentEl).setName("총 문제 수").addText((t) =>
      t.setValue(String(this.input.totalQuestions)).onChange((v) => {
        const n = parseInt(v, 10);
        if (isFinite(n) && n > 0) this.input.totalQuestions = n;
      })
    );

    new Setting(contentEl)
      .setName("5-gram 겹침 임계 (0~1)")
      .setDesc("이 비율 초과면 슬롯 재생성")
      .addText((t) =>
        t.setValue(String(this.input.similarityThreshold)).onChange((v) => {
          const n = parseFloat(v);
          if (isFinite(n) && n >= 0 && n <= 1) this.input.similarityThreshold = n;
        })
      );

    new Setting(contentEl)
      .setName("연속 일치 최대 단어")
      .setDesc("원본과 연속으로 일치한 단어 수가 이 값 초과면 재생성")
      .addText((t) =>
        t.setValue(String(this.input.maxConsecutiveRun)).onChange((v) => {
          const n = parseInt(v, 10);
          if (isFinite(n) && n > 0) this.input.maxConsecutiveRun = n;
        })
      );

    new Setting(contentEl)
      .setName("슬롯당 재시도 횟수")
      .addText((t) =>
        t.setValue(String(this.input.retryPerSlot)).onChange((v) => {
          const n = parseInt(v, 10);
          if (isFinite(n) && n >= 0) this.input.retryPerSlot = n;
        })
      );

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("취소").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("생성 시작")
          .setCta()
          .onClick(() => {
            if (!this.input.roundId) {
              new Notice("회차 ID는 필수입니다.");
              return;
            }
            this.onSubmit(this.input);
            this.close();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
