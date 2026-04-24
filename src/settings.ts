import { App, PluginSettingTab, Setting } from "obsidian";
import type ExamWorkbookPlugin from "./main";

export interface ExamWorkbookSettings {
  ollamaUrl: string;
  visionModel: string;
  structureModel: string;
  reasoningModel: string;
  defaultWorkspaceRoot: string;
  pdfRenderScale: number;
  maxPagesPerImport: number;
  requestTimeoutMs: number;
  ocrConfidenceThreshold: number;
}

export const DEFAULT_SETTINGS: ExamWorkbookSettings = {
  ollamaUrl: "http://localhost:11434",
  visionModel: "gemma3:4b",
  structureModel: "mistral:7b",
  reasoningModel: "gemma2:9b",
  defaultWorkspaceRoot: "",
  pdfRenderScale: 2.0,
  maxPagesPerImport: 500,
  requestTimeoutMs: 180000,
  ocrConfidenceThreshold: 0.6,
};

export class ExamWorkbookSettingTab extends PluginSettingTab {
  plugin: ExamWorkbookPlugin;

  constructor(app: App, plugin: ExamWorkbookPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Exam Workbook Builder" });

    new Setting(containerEl)
      .setName("Ollama URL")
      .setDesc("로컬 Ollama 서버 주소")
      .addText((t) =>
        t
          .setPlaceholder("http://localhost:11434")
          .setValue(this.plugin.settings.ollamaUrl)
          .onChange(async (v) => {
            this.plugin.settings.ollamaUrl = v.trim() || DEFAULT_SETTINGS.ollamaUrl;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vision 모델 (OCR)")
      .setDesc("이미지 → 텍스트 변환에 사용")
      .addText((t) =>
        t
          .setPlaceholder("gemma3:4b")
          .setValue(this.plugin.settings.visionModel)
          .onChange(async (v) => {
            this.plugin.settings.visionModel = v.trim() || DEFAULT_SETTINGS.visionModel;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Structure 모델 (구조화)")
      .setDesc("raw → Q 포맷 변환용 경량 모델")
      .addText((t) =>
        t
          .setPlaceholder("mistral:7b")
          .setValue(this.plugin.settings.structureModel)
          .onChange(async (v) => {
            this.plugin.settings.structureModel = v.trim() || DEFAULT_SETTINGS.structureModel;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reasoning 모델 (개념·생성)")
      .setDesc("개념 태깅과 신규 문제 생성에 사용")
      .addText((t) =>
        t
          .setPlaceholder("gemma2:9b")
          .setValue(this.plugin.settings.reasoningModel)
          .onChange(async (v) => {
            this.plugin.settings.reasoningModel = v.trim() || DEFAULT_SETTINGS.reasoningModel;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("기본 워크스페이스 루트")
      .setDesc("Init workspace 명령 실행 시 기본 경로. 비워두면 vault 루트에 cert 폴더 직접 생성.")
      .addText((t) =>
        t
          .setPlaceholder("exam-workbooks")
          .setValue(this.plugin.settings.defaultWorkspaceRoot)
          .onChange(async (v) => {
            this.plugin.settings.defaultWorkspaceRoot = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("PDF 렌더 배율")
      .setDesc("페이지 이미지 해상도 배율 (2.0 ≈ 300dpi). 값이 높을수록 OCR 정확도↑ 용량↑")
      .addText((t) =>
        t
          .setPlaceholder("2.0")
          .setValue(String(this.plugin.settings.pdfRenderScale))
          .onChange(async (v) => {
            const n = parseFloat(v);
            this.plugin.settings.pdfRenderScale = isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.pdfRenderScale;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Import PDF: 최대 페이지")
      .setDesc("1회 임포트당 렌더링할 최대 페이지 수 (초과 시 앞쪽만 처리)")
      .addText((t) =>
        t
          .setPlaceholder("500")
          .setValue(String(this.plugin.settings.maxPagesPerImport))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.maxPagesPerImport = isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.maxPagesPerImport;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ollama 요청 타임아웃 (ms)")
      .addText((t) =>
        t
          .setPlaceholder("180000")
          .setValue(String(this.plugin.settings.requestTimeoutMs))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            this.plugin.settings.requestTimeoutMs = isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.requestTimeoutMs;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OCR 신뢰도 임계값")
      .setDesc("이 값 미만이면 해당 페이지를 needs_review로 표시")
      .addText((t) =>
        t
          .setPlaceholder("0.6")
          .setValue(String(this.plugin.settings.ocrConfidenceThreshold))
          .onChange(async (v) => {
            const n = parseFloat(v);
            this.plugin.settings.ocrConfidenceThreshold =
              isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_SETTINGS.ocrConfidenceThreshold;
            await this.plugin.saveSettings();
          })
      );
  }
}
