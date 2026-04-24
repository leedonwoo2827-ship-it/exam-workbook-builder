import { App, TFile, TFolder } from "obsidian";
import { generateText } from "../ollama";
import { PROMPTS } from "../embedded";
import { todayIsoDate } from "../utils";
import {
  flattenConcepts,
  buildConceptIndex,
  parseSubjectYaml,
  SubjectConfig,
} from "../concepts/parseSubjectYaml";
import { normalizeConcepts, parseTagResponse } from "../concepts/parseTagResponse";
import { upsertConceptHub } from "../concepts/conceptHub";
import { splitFrontmatter, joinFrontmatter, mergeFrontmatter } from "../concepts/frontmatter";

export interface TagQuestionInput {
  questionFile: TFile;
  ollamaUrl: string;
  reasoningModel: string;
  timeoutMs: number;
  /** 미리 로드된 cert subject. 미제공 시 questionFile 경로에서 추정해 읽음. */
  subject?: SubjectConfig;
  certRoot?: string;
}

export interface TagQuestionResult {
  qid: string;
  primaryConcept: string;
  concepts: string[];
  candidateCount: number;
  hubsTouched: string[];
  rationale: string;
}

export async function tagQuestion(app: App, input: TagQuestionInput): Promise<TagQuestionResult> {
  const certRoot = input.certRoot ?? inferCertRootFromQ(input.questionFile.path);
  if (!certRoot) {
    throw new Error("이 Q 파일이 속한 cert 워크스페이스를 추정하지 못했습니다 (03_structured 위치 확인).");
  }
  const subject = input.subject ?? (await loadSubject(app, certRoot));
  const whitelist = flattenConcepts(subject);
  if (whitelist.length === 0) {
    throw new Error("subject.yaml에 concept 화이트리스트가 비어있습니다. 먼저 subject.yaml을 채우세요.");
  }
  const conceptIndex = buildConceptIndex(subject);

  const text = await app.vault.read(input.questionFile);
  const { data: frontmatter, body } = splitFrontmatter(text);
  const qid = String(frontmatter["qid"] ?? input.questionFile.basename);

  const userMessage = buildUserMessage(subject.cert || "CERT", whitelist, body);
  const response = await generateText({
    url: input.ollamaUrl,
    model: input.reasoningModel,
    system: PROMPTS.conceptTag,
    prompt: userMessage,
    temperature: 0.2,
    timeoutMs: input.timeoutMs,
    format: "json",
  });

  const tag = parseTagResponse(response);
  const concepts = normalizeConcepts(tag.concepts, whitelist);
  if (concepts.length === 0) {
    throw new Error("모델 응답에서 concept을 추출하지 못했습니다 (응답 일부: " + response.slice(0, 120) + " )");
  }

  // primary 우선순위: 모델이 준 primary가 화이트리스트에 있으면 그것, 아니면 concepts[0]
  let primary = tag.primaryConcept.trim();
  if (primary && !whitelist.includes(primary)) {
    primary = concepts.find((c) => !c.startsWith("candidate:")) ?? concepts[0];
  } else if (!primary) {
    primary = concepts.find((c) => !c.startsWith("candidate:")) ?? concepts[0];
  }
  // primary가 candidate: 형태로 들어왔으면 접두어 제거하지 않은 채 사용 (허브 폴더 분기됨)

  const hubsTouched: string[] = [];
  for (const c of concepts) {
    const meta = !c.startsWith("candidate:") ? conceptIndex.get(c) : undefined;
    const path = await upsertConceptHub(app, certRoot, c, qid, meta);
    hubsTouched.push(path);
  }

  // frontmatter 갱신
  const updated = mergeFrontmatter(frontmatter, {
    concepts,
    primary_concept: primary,
    concept_rationale: tag.rationale,
    tagging: {
      model_version: input.reasoningModel,
      tagged_at: todayIsoDate(),
    },
    subject_code: conceptIndex.get(primary)?.subjectCode ?? frontmatter["subject_code"] ?? "?",
  });
  const newText = joinFrontmatter(updated, body);
  await app.vault.modify(input.questionFile, newText);

  const candidateCount = concepts.filter((c) => c.startsWith("candidate:")).length;
  return { qid, primaryConcept: primary, concepts, candidateCount, hubsTouched, rationale: tag.rationale };
}

function buildUserMessage(cert: string, whitelist: string[], body: string): string {
  return `아래는 ${cert} 문제 1건이다. 화이트리스트의 개념 1~3개를 선택해 다음 JSON으로만 응답하라:

{
  "concepts": ["개념1", "개념2"],
  "primary_concept": "개념1",
  "concept_rationale": "2문장 이내 근거"
}

화이트리스트에 없는 새 개념은 \`candidate:신규개념\` 형태로 제안하라.

[화이트리스트]
${whitelist.join(", ")}

[문제 md]
${body.trim()}
`;
}

async function loadSubject(app: App, certRoot: string): Promise<SubjectConfig> {
  const path = certRoot + "/subject.yaml";
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`subject.yaml을 찾지 못했습니다: ${path}`);
  const yaml = await app.vault.read(f);
  return parseSubjectYaml(yaml);
}

export function inferCertRootFromQ(path: string): string | null {
  const parts = path.split("/");
  const idx = parts.findIndex((p) => p === "03_structured");
  if (idx <= 0) return null;
  return parts.slice(0, idx).join("/");
}

export function isStructuredSourceFolder(folder: TFolder): boolean {
  const parts = folder.path.split("/");
  return parts.length >= 2 && parts[parts.length - 2] === "03_structured";
}
