import { App, Notice, TFile, TFolder } from "obsidian";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DEFAULT_SUBPATHS } from "../types";
import { joinPath, pad, sanitizeSlug, sha256Hex, todayIsoDate } from "../utils";

// worker 비활성 (Obsidian 환경에서 worker 파일 배포 부담을 피함; 동기 처리로 수십 MB PDF까지 무난)
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

export interface ImportPdfInput {
  pdfBytes: ArrayBuffer;
  pdfFileName: string;            // 원본 파일 이름
  certRoot: string;               // 워크스페이스 cert 폴더 경로
  certCode: string;
  slug?: string;
  renderScale: number;
  maxPages: number;
  onProgress?: (done: number, total: number) => void;
}

export interface ImportPdfResult {
  sourceId: string;
  sourceDir: string;
  pageCount: number;
  rendered: number;
}

export async function importPdf(app: App, input: ImportPdfInput): Promise<ImportPdfResult> {
  const slug = input.slug ?? sanitizeSlug(input.pdfFileName.replace(/\.pdf$/i, ""));
  const datePart = todayIsoDate().replace(/-/g, "").slice(2); // YYMMDD
  const sourceId = `${datePart}_${input.certCode}_${slug}`;
  const sourceDir = joinPath(input.certRoot, DEFAULT_SUBPATHS.source, sourceId);
  const pagesDir = joinPath(sourceDir, "pages");

  await ensureFolder(app, sourceDir);
  await ensureFolder(app, pagesDir);

  const pdfPath = joinPath(sourceDir, "source.pdf");
  if (!(app.vault.getAbstractFileByPath(pdfPath) instanceof TFile)) {
    await app.vault.createBinary(pdfPath, input.pdfBytes);
  }

  const pdfCopy = input.pdfBytes.slice(0);
  const doc: PDFDocumentProxy = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfCopy),
    disableWorker: true,
    isEvalSupported: false,
  } as unknown as Parameters<typeof pdfjsLib.getDocument>[0]).promise;

  const total = Math.min(doc.numPages, input.maxPages);
  let rendered = 0;

  for (let p = 1; p <= total; p++) {
    const pagePath = joinPath(pagesDir, `p${pad(p, 4)}.png`);
    if (app.vault.getAbstractFileByPath(pagePath) instanceof TFile) {
      rendered++;
      input.onProgress?.(rendered, total);
      continue;
    }

    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: input.renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2D context 생성 실패");

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob 실패"))), "image/png")
    );
    const buf = await blob.arrayBuffer();
    await app.vault.createBinary(pagePath, buf);

    rendered++;
    input.onProgress?.(rendered, total);
    // cleanup
    page.cleanup();
  }

  const sha = await sha256Hex(pdfCopy);
  const manifest = {
    sourceId,
    originalFileName: input.pdfFileName,
    sha256: sha,
    pageCount: doc.numPages,
    renderedPages: rendered,
    renderScale: input.renderScale,
    importedAt: todayIsoDate(),
  };
  const manifestPath = joinPath(sourceDir, "manifest.json");
  const manifestContent = JSON.stringify(manifest, null, 2);
  const existing = app.vault.getAbstractFileByPath(manifestPath);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, manifestContent);
  } else {
    await app.vault.create(manifestPath, manifestContent);
  }

  return { sourceId, sourceDir, pageCount: doc.numPages, rendered };
}

async function ensureFolder(app: App, path: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFolder) return;
  if (existing) throw new Error(`경로 충돌: ${path}`);
  await app.vault.createFolder(path);
}

export async function pickPdfFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      resolve(f);
    };
    input.click();
  });
}
