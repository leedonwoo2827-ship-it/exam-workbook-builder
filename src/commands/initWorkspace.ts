import { App, Modal, Notice, Setting, TFolder } from "obsidian";
import { DEFAULT_SUBPATHS, REFERENCE_CATEGORIES } from "../types";
import { DEFAULT_SUBJECT_YAML, REFERENCES_README, TEMPLATES } from "../embedded";
import { joinPath, todayIsoDate } from "../utils";

export interface InitWorkspaceInput {
  root: string;            // 예: "exam-workbooks" 또는 "" (vault root)
  certCode: string;        // 예: "sqld"
  certNameKor: string;     // 예: "SQL 개발자"
  authority: string;       // 예: "한국데이터산업진흥원"
  homepage: string;        // 예: "https://www.dataq.or.kr/"
}

export class InitWorkspaceModal extends Modal {
  private input: InitWorkspaceInput;
  private onSubmit: (v: InitWorkspaceInput) => void;

  constructor(app: App, defaults: InitWorkspaceInput, onSubmit: (v: InitWorkspaceInput) => void) {
    super(app);
    this.input = { ...defaults };
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ewb-modal");
    contentEl.createEl("h2", { text: "자격증 워크스페이스 초기화" });

    new Setting(contentEl)
      .setName("상위 루트 폴더")
      .setDesc("vault 내 경로. 빈 값이면 vault 루트에 바로 cert 폴더 생성.")
      .addText((t) =>
        t.setPlaceholder("exam-workbooks").setValue(this.input.root).onChange((v) => {
          this.input.root = v.trim();
        })
      );

    new Setting(contentEl)
      .setName("자격증 코드 (cert_code)")
      .setDesc("영문 소문자/숫자 (폴더명으로 사용). 예: sqld, comp1, engineer")
      .addText((t) =>
        t.setPlaceholder("sqld").setValue(this.input.certCode).onChange((v) => {
          this.input.certCode = v.trim();
        })
      );

    new Setting(contentEl)
      .setName("자격증 한국어명")
      .addText((t) =>
        t.setValue(this.input.certNameKor).onChange((v) => {
          this.input.certNameKor = v.trim();
        })
      );

    new Setting(contentEl)
      .setName("주관 기관")
      .addText((t) =>
        t.setValue(this.input.authority).onChange((v) => {
          this.input.authority = v.trim();
        })
      );

    new Setting(contentEl)
      .setName("공식 홈페이지 (URL)")
      .addText((t) =>
        t.setValue(this.input.homepage).onChange((v) => {
          this.input.homepage = v.trim();
        })
      );

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("취소").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("생성")
          .setCta()
          .onClick(() => {
            if (!this.input.certCode) {
              new Notice("cert_code는 필수입니다.");
              return;
            }
            if (!/^[a-z0-9_-]+$/.test(this.input.certCode)) {
              new Notice("cert_code는 영문 소문자/숫자/-/_만 허용됩니다.");
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

export async function initWorkspace(app: App, input: InitWorkspaceInput): Promise<string> {
  const certRoot = joinPath(input.root, input.certCode);
  await ensureFolder(app, certRoot);

  const folders = [
    joinPath(certRoot, DEFAULT_SUBPATHS.references),
    ...REFERENCE_CATEGORIES.map((c) => joinPath(certRoot, DEFAULT_SUBPATHS.references, c)),
    joinPath(certRoot, DEFAULT_SUBPATHS.source),
    joinPath(certRoot, DEFAULT_SUBPATHS.raw),
    joinPath(certRoot, DEFAULT_SUBPATHS.structured),
    joinPath(certRoot, DEFAULT_SUBPATHS.concepts),
    joinPath(certRoot, DEFAULT_SUBPATHS.rounds),
    joinPath(certRoot, DEFAULT_SUBPATHS.output),
    joinPath(certRoot, DEFAULT_SUBPATHS.cache),
    joinPath(certRoot, DEFAULT_SUBPATHS.review),
  ];
  for (const f of folders) await ensureFolder(app, f);

  const overviewPath = joinPath(certRoot, DEFAULT_SUBPATHS.overview);
  const overviewContent = renderOverview(input, TEMPLATES.examOverview);
  await writeIfMissing(app, overviewPath, overviewContent);

  const subjectPath = joinPath(certRoot, DEFAULT_SUBPATHS.subjectYaml);
  await writeIfMissing(
    app,
    subjectPath,
    DEFAULT_SUBJECT_YAML.replace("CERT_CODE", input.certCode.toUpperCase())
  );

  const refsReadme = joinPath(certRoot, DEFAULT_SUBPATHS.references, "README.md");
  await writeIfMissing(app, refsReadme, REFERENCES_README);

  return certRoot;
}

async function ensureFolder(app: App, path: string): Promise<void> {
  if (!path) return;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFolder) return;
  if (existing) throw new Error(`경로 충돌: ${path} (파일이 이미 존재)`);
  await app.vault.createFolder(path);
}

async function writeIfMissing(app: App, path: string, content: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing) return;
  await app.vault.create(path, content);
}

function renderOverview(input: InitWorkspaceInput, tpl: string): string {
  return tpl
    .replace(/\{SQLD\|COMP1\|COMP2\|ENGINEER\|\.\.\.\}/g, input.certCode.toUpperCase())
    .replace(/\{자격증 한국어명\}/g, input.certNameKor)
    .replace(/\{영문명\}/g, "")
    .replace(/\{주관기관명\}/g, input.authority)
    .replace(/\{공식 URL\}/g, input.homepage)
    .replace(/\{자격증명\}/g, input.certNameKor)
    .replace(/YYYY-MM-DD/, todayIsoDate())
    .replace("draft|verified|stale", "draft");
}
