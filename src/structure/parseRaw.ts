export interface RawMeta {
  sourcePage: number;
  sourceImage: string;
  ocrModel: string;
  ocredAt: string;
  extractionConfidence: number | null;
}

export interface ParsedRaw {
  meta: RawMeta;
  body: string;          // frontmatter 제외한 원문
}

/**
 * 02_raw/.../p####.raw.md를 파싱해 frontmatter 메타와 본문을 분리한다.
 * frontmatter는 ocrPage가 작성한 표준 키만 사용 (source_page, source_image, ocr_model, ocred_at).
 * vision 모델이 본문 안에 또 frontmatter를 넣은 경우는 이미 ocrPage에서 한 차례 stripDuplicateFrontmatter로 제거되지만,
 * 안전하게 한 번 더 검사한다.
 */
export function parseRawMd(content: string): ParsedRaw {
  const meta: RawMeta = {
    sourcePage: 0,
    sourceImage: "",
    ocrModel: "",
    ocredAt: "",
    extractionConfidence: null,
  };

  let body = content;
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    body = content.slice(m[0].length);
    const fm = m[1];
    for (const line of fm.split(/\r?\n/)) {
      const kv = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1];
      const value = kv[2].trim();
      switch (key) {
        case "source_page":
          meta.sourcePage = parseInt(value, 10) || 0;
          break;
        case "source_image":
          meta.sourceImage = value;
          break;
        case "ocr_model":
          meta.ocrModel = value;
          break;
        case "ocred_at":
          meta.ocredAt = value;
          break;
        case "extraction_confidence": {
          const f = parseFloat(value);
          meta.extractionConfidence = isFinite(f) ? f : null;
          break;
        }
      }
    }
  }

  // 본문 앞에 다시 frontmatter 블록이 붙어있는 비정상 케이스 한 번만 더 제거
  const m2 = body.match(/^\s*---\n[\s\S]*?\n---\n?/);
  if (m2) body = body.slice(m2[0].length);

  return { meta, body: body.trim() };
}

/** raw.md 경로에서 sourceId 추출. 예: `<root>/<cert>/02_raw/<sourceId>/p0001.raw.md` → `<sourceId>` */
export function inferSourceIdFromRawPath(rawPath: string): string | null {
  const parts = rawPath.split("/");
  const idx = parts.findIndex((p) => p === "02_raw");
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1];
}

/** raw.md 경로에서 cert 루트(02_raw 직전 폴더) 추출. */
export function inferCertRootFromRawPath(rawPath: string): string | null {
  const parts = rawPath.split("/");
  const idx = parts.findIndex((p) => p === "02_raw");
  if (idx <= 0) return null;
  return parts.slice(0, idx).join("/");
}
