#!/usr/bin/env node
/**
 * docs/SUPPORTED_CERTS.md를 파싱해 표 안의 모든 공식 URL의 도달 가능 여부를 검사한다.
 *
 *  - Node 18+ 의 글로벌 fetch만 사용 (외부 의존 0)
 *  - 동시 요청 6개로 병렬 처리, 요청당 12s 타임아웃
 *  - 결과는 stdout 표 + (선택) JSON 리포트로 docs/cert-urls-report.json에 저장
 *  - exit code: 도달 실패 1건 이상이면 1, 모두 OK면 0
 *
 * 실행:
 *   node scripts/check-cert-urls.mjs
 *   npm run check:catalog
 */
import fs from "node:fs/promises";
import path from "node:path";

const CATALOG = "docs/SUPPORTED_CERTS.md";
const REPORT = "docs/cert-urls-report.json";
const CONCURRENCY = 6;
const TIMEOUT_MS = 12000;
const USER_AGENT = "exam-workbook-builder/url-check (+https://github.com/leedonwoo2827-ship-it/exam-workbook-builder)";

const root = process.cwd();
const catalogPath = path.join(root, CATALOG);

const text = await fs.readFile(catalogPath, "utf-8").catch((e) => {
  console.error(`[check-cert-urls] cannot read ${CATALOG}: ${e.message}`);
  process.exit(2);
});

const urls = extractUrls(text);
console.log(`[check-cert-urls] found ${urls.length} unique URLs in ${CATALOG}`);

const results = [];
let inflight = 0;
let cursor = 0;

await new Promise((resolve) => {
  function pump() {
    while (inflight < CONCURRENCY && cursor < urls.length) {
      const idx = cursor++;
      const url = urls[idx];
      inflight++;
      check(url)
        .then((r) => {
          results[idx] = r;
        })
        .finally(() => {
          inflight--;
          if (cursor >= urls.length && inflight === 0) resolve();
          else pump();
        });
    }
  }
  pump();
});

results.sort((a, b) => (a.url < b.url ? -1 : 1));

let failed = 0;
console.log("");
console.log("status  ms     url");
console.log("------  -----  ------------------------------------");
for (const r of results) {
  const tag = r.ok ? "OK    " : "FAIL  ";
  const ms = String(r.ms).padStart(5, " ");
  console.log(`${tag}  ${ms}  ${r.url}${r.note ? "  (" + r.note + ")" : ""}`);
  if (!r.ok) failed++;
}
console.log("");
console.log(`[check-cert-urls] ${results.length - failed} OK, ${failed} FAIL`);

const report = {
  generatedAt: new Date().toISOString(),
  catalog: CATALOG,
  total: results.length,
  failed,
  results,
};
await fs.writeFile(path.join(root, REPORT), JSON.stringify(report, null, 2));
console.log(`[check-cert-urls] report written: ${REPORT}`);

process.exit(failed > 0 ? 1 : 0);

// ─────────────────────────────────────────────

function extractUrls(md) {
  // 표 행에서 https?://… 패턴만. 중복 제거.
  const re = /(https?:\/\/[^\s|)\]]+)/g;
  const set = new Set();
  for (const m of md.matchAll(re)) {
    const url = m[1].replace(/[.,;:!?)]+$/, "");
    set.add(url);
  }
  return [...set].sort();
}

async function check(url) {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    });
    // 일부 서버는 HEAD를 막거나 405를 돌려준다 — GET으로 재시도
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      });
    }
    const ms = Date.now() - start;
    return {
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      ms,
      note: res.status >= 400 ? `HTTP ${res.status}` : "",
    };
  } catch (e) {
    return {
      url,
      status: 0,
      ok: false,
      ms: Date.now() - start,
      note: e.name === "AbortError" ? "timeout" : (e.message || "error").slice(0, 80),
    };
  } finally {
    clearTimeout(t);
  }
}
