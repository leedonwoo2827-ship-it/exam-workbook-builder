import { Menu, Notice, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import {
  DEFAULT_SETTINGS,
  ExamWorkbookSettings,
  ExamWorkbookSettingTab,
} from "./settings";
import {
  InitWorkspaceInput,
  InitWorkspaceModal,
  initWorkspace,
} from "./commands/initWorkspace";
import { importPdf, pickPdfFile, readVaultPdf } from "./commands/importPdf";
import { ocrPage } from "./commands/ocrPage";
import { structureRaw } from "./commands/structureRaw";
import { isRawSourceFolder, structureSource } from "./commands/structureSource";
import { isStructuredSourceFolder, tagQuestion } from "./commands/tagQuestion";
import { tagSource } from "./commands/tagSource";
import { listModels } from "./ollama";
import { notify } from "./utils";

export default class ExamWorkbookPlugin extends Plugin {
  settings: ExamWorkbookSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "init-exam-workspace",
      name: "자격증 워크스페이스 초기화",
      callback: () => this.openInitModal(),
    });

    this.addCommand({
      id: "import-pdf",
      name: "PDF 가져오기 (현재 워크스페이스에 페이지 분할)",
      callback: () => this.runImportPdf(),
    });

    this.addCommand({
      id: "import-active-pdf",
      name: "PDF 가져오기 (현재 활성 PDF)",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const ok = !!file && file.extension.toLowerCase() === "pdf";
        if (!checking && ok && file) void this.runImportVaultPdf(file);
        return ok;
      },
    });

    this.addCommand({
      id: "ocr-current-page",
      name: "OCR 실행 (현재 페이지 이미지)",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const ok = !!file && file.extension.toLowerCase() === "png";
        if (!checking && ok && file) void this.runOcr(file);
        return ok;
      },
    });

    this.addCommand({
      id: "structure-current-raw",
      name: "구조화 실행 (현재 raw.md)",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const ok = !!file && file.name.endsWith(".raw.md");
        if (!checking && ok && file) void this.runStructureRaw(file);
        return ok;
      },
    });

    this.addCommand({
      id: "tag-current-question",
      name: "개념 태깅 실행 (현재 Q.md)",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const ok = !!file && /^Q\d{3,}\.md$/i.test(file.name);
        if (!checking && ok && file) void this.runTagQuestion(file);
        return ok;
      },
    });

    this.addCommand({
      id: "check-ollama",
      name: "Ollama 연결 확인",
      callback: () => this.runCheckOllama(),
    });

    this.addSettingTab(new ExamWorkbookSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
        this.decorateFileMenu(menu, file);
      })
    );
  }

  private decorateFileMenu(menu: Menu, file: TAbstractFile): void {
    if (file instanceof TFile) {
      const ext = file.extension.toLowerCase();
      if (ext === "pdf") {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: PDF 가져오기")
            .setIcon("file-input")
            .onClick(() => void this.runImportVaultPdf(file))
        );
      } else if (ext === "png" && /\/pages\//.test(file.path)) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 페이지 OCR")
            .setIcon("scan")
            .onClick(() => void this.runOcr(file))
        );
      } else if (file.name.endsWith(".raw.md")) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 raw 구조화")
            .setIcon("list-ordered")
            .onClick(() => void this.runStructureRaw(file))
        );
      } else if (/^Q\d{3,}\.md$/i.test(file.name)) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 문제 태깅")
            .setIcon("tag")
            .onClick(() => void this.runTagQuestion(file))
        );
      }
      return;
    }

    if (file instanceof TFolder) {
      if (this.isCertRoot(file)) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 워크스페이스에 PDF 가져오기")
            .setIcon("file-plus")
            .onClick(() => void this.runImportPdfFor(file.path))
        );
      }
      if (isRawSourceFolder(file)) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 source 일괄 구조화")
            .setIcon("layers")
            .onClick(() => void this.runStructureSource(file))
        );
      }
      if (isStructuredSourceFolder(file)) {
        menu.addItem((item) =>
          item
            .setTitle("Exam Workbook: 이 source 일괄 태깅")
            .setIcon("tags")
            .onClick(() => void this.runTagSource(file))
        );
      }
    }
  }

  private isCertRoot(folder: TFolder): boolean {
    const probes = ["00_시험개요.md", "subject.yaml", "01_원본", "05_rounds"];
    return probes.some(
      (p) => this.app.vault.getAbstractFileByPath(folder.path + "/" + p) !== null
    );
  }

  onunload(): void {
    /* no-op */
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as { settings?: Partial<ExamWorkbookSettings> } | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData({ settings: this.settings });
  }

  private openInitModal(): void {
    const defaults: InitWorkspaceInput = {
      root: this.settings.defaultWorkspaceRoot,
      certCode: "sqld",
      certNameKor: "",
      authority: "",
      homepage: "",
    };
    new InitWorkspaceModal(this.app, defaults, async (input) => {
      try {
        const created = await initWorkspace(this.app, input);
        notify(`워크스페이스 생성 완료: ${created}`);
      } catch (e) {
        notify(`초기화 실패: ${(e as Error).message}`, 8000);
      }
    }).open();
  }

  private async runImportPdf(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    const certRoot = this.inferCertRoot(activeFile?.path);
    if (!certRoot) {
      notify(
        "cert 워크스페이스 컨텍스트를 찾지 못했습니다. cert 폴더 내부 파일을 연 상태에서 실행하거나, 먼저 '자격증 워크스페이스 초기화'를 실행하세요.",
        8000
      );
      return;
    }
    const file = await pickPdfFile();
    if (!file) return;
    const buf = await file.arrayBuffer();
    await this.doImport(certRoot, buf, file.name);
  }

  private async runImportPdfFor(certRoot: string): Promise<void> {
    const file = await pickPdfFile();
    if (!file) return;
    const buf = await file.arrayBuffer();
    await this.doImport(certRoot, buf, file.name);
  }

  private async runImportVaultPdf(file: TFile): Promise<void> {
    const certRoot = this.inferCertRoot(file.path);
    if (!certRoot) {
      notify(
        "이 PDF가 속한 cert 워크스페이스를 찾지 못했습니다. cert 폴더 내부에서 실행하세요.",
        8000
      );
      return;
    }
    const buf = await readVaultPdf(this.app, file);
    await this.doImport(certRoot, buf, file.name);
  }

  private async doImport(certRoot: string, buf: ArrayBuffer, pdfFileName: string): Promise<void> {
    const certCode = certRoot.split("/").slice(-1)[0];
    const notice = new Notice(`PDF 임포트 중: ${pdfFileName} (0/?)`, 0);
    try {
      const res = await importPdf(this.app, {
        pdfBytes: buf,
        pdfFileName,
        certRoot,
        certCode,
        renderScale: this.settings.pdfRenderScale,
        maxPages: this.settings.maxPagesPerImport,
        onProgress: (done, total) => {
          notice.setMessage(`PDF 임포트 중: ${pdfFileName} (${done}/${total})`);
        },
      });
      notice.hide();
      notify(`완료: ${res.rendered}/${res.pageCount}쪽 → ${res.sourceDir}`, 6000);
    } catch (e) {
      notice.hide();
      notify(`임포트 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runStructureRaw(file: TFile): Promise<void> {
    const notice = new Notice(`구조화 중: ${file.name}`, 0);
    try {
      const r = await structureRaw(this.app, {
        rawFile: file,
        ollamaUrl: this.settings.ollamaUrl,
        structureModel: this.settings.structureModel,
        timeoutMs: this.settings.requestTimeoutMs,
      });
      notice.hide();
      notify(
        `구조화 완료 · ${file.name}: ${r.written.length} 작성 / ${r.skippedExisting} 스킵 / ${r.invalid} 검증실패 (총 추출 ${r.total})`,
        7000
      );
    } catch (e) {
      notice.hide();
      notify(`구조화 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runStructureSource(folder: TFolder): Promise<void> {
    const notice = new Notice(`구조화 일괄 처리: ${folder.path} (0/?)`, 0);
    try {
      const summary = await structureSource(this.app, {
        sourceFolder: folder,
        ollamaUrl: this.settings.ollamaUrl,
        structureModel: this.settings.structureModel,
        timeoutMs: this.settings.requestTimeoutMs,
        onProgress: (done, total, name) => {
          notice.setMessage(`구조화 일괄 처리: ${name} (${done}/${total})`);
        },
      });
      notice.hide();
      const failedNote = summary.failedFiles.length
        ? ` · 실패 ${summary.failedFiles.length}건 (콘솔 확인)`
        : "";
      if (summary.failedFiles.length) {
        // eslint-disable-next-line no-console
        console.warn("[Exam Workbook] 일괄 구조화 실패 목록:", summary.failedFiles);
      }
      notify(
        `일괄 구조화 완료 · ${summary.processedFiles}/${summary.totalFiles} 파일 · ${summary.totalQuestionsWritten} 작성 / ${summary.totalSkipped} 스킵 / ${summary.totalInvalid} 검증실패${failedNote}`,
        9000
      );
    } catch (e) {
      notice.hide();
      notify(`일괄 구조화 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runTagQuestion(file: TFile): Promise<void> {
    const notice = new Notice(`개념 태깅 중: ${file.name}`, 0);
    try {
      const r = await tagQuestion(this.app, {
        questionFile: file,
        ollamaUrl: this.settings.ollamaUrl,
        reasoningModel: this.settings.reasoningModel,
        timeoutMs: this.settings.requestTimeoutMs,
      });
      notice.hide();
      const candNote = r.candidateCount > 0 ? ` · 신규제안 ${r.candidateCount}` : "";
      notify(`태깅 완료 · ${r.qid} → ${r.primaryConcept} (${r.concepts.length}개${candNote})`, 7000);
    } catch (e) {
      notice.hide();
      notify(`태깅 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runTagSource(folder: TFolder): Promise<void> {
    const notice = new Notice(`태깅 일괄 처리: ${folder.path} (0/?)`, 0);
    try {
      const summary = await tagSource(this.app, {
        sourceFolder: folder,
        ollamaUrl: this.settings.ollamaUrl,
        reasoningModel: this.settings.reasoningModel,
        timeoutMs: this.settings.requestTimeoutMs,
        onProgress: (done, total, name) => {
          notice.setMessage(`태깅 일괄 처리: ${name} (${done}/${total})`);
        },
      });
      notice.hide();
      if (summary.failed.length) {
        // eslint-disable-next-line no-console
        console.warn("[Exam Workbook] 일괄 태깅 실패 목록:", summary.failed);
      }
      const failedNote = summary.failed.length ? ` · 실패 ${summary.failed.length}건 (콘솔)` : "";
      notify(
        `일괄 태깅 완료 · 처리 ${summary.processed}/${summary.totalFiles} · 스킵 ${summary.skipped} · 신규제안 ${summary.candidateConcepts}${failedNote}`,
        9000
      );
    } catch (e) {
      notice.hide();
      notify(`일괄 태깅 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runOcr(file: TFile): Promise<void> {
    const notice = new Notice(`OCR 실행 중: ${file.name}`, 0);
    try {
      const res = await ocrPage(this.app, {
        imageFile: file,
        ollamaUrl: this.settings.ollamaUrl,
        visionModel: this.settings.visionModel,
        timeoutMs: this.settings.requestTimeoutMs,
        confidenceThreshold: this.settings.ocrConfidenceThreshold,
      });
      notice.hide();
      notify(`OCR 완료 → ${res.outputPath}`, 6000);
    } catch (e) {
      notice.hide();
      notify(`OCR 실패: ${(e as Error).message}`, 8000);
    }
  }

  private async runCheckOllama(): Promise<void> {
    try {
      const models = await listModels(this.settings.ollamaUrl);
      notify(`Ollama OK · 모델 ${models.length}개: ${models.slice(0, 6).join(", ")}${models.length > 6 ? " ..." : ""}`, 8000);
    } catch (e) {
      notify(`Ollama 연결 실패: ${(e as Error).message}`, 8000);
    }
  }

  /**
   * 활성 파일 경로에서 cert 루트(= workspace 초기화 시 만든 폴더)를 추정.
   * 규칙: 경로 세그먼트 중 다음 중 하나의 서브폴더를 포함하는 첫 번째 조상을 cert 루트로 간주.
   *   00_시험개요.md / 00_참고자료 / 01_원본 / 02_raw / 03_structured / 04_concepts / 05_rounds / 06_output / subject.yaml
   */
  private inferCertRoot(activePath?: string): string | null {
    if (!activePath) return null;
    const markers = [
      "00_시험개요.md",
      "00_참고자료",
      "01_원본",
      "02_raw",
      "03_structured",
      "04_concepts",
      "05_rounds",
      "06_output",
      "subject.yaml",
    ];
    const parts = activePath.split("/");
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts.slice(0, i + 1).join("/");
      for (const m of markers) {
        const probe = candidate + "/" + m;
        if (this.app.vault.getAbstractFileByPath(probe)) {
          return candidate;
        }
      }
    }
    return null;
  }
}
