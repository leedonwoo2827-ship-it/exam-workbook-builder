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
const TIMEOUT_MS = 15000;
// 일부 정부·기관 사이트는 비표준 UA를 봇으로 보고 차단함. 실제 브라우저처럼 위장.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
// CI 환경에서 일관되게 블록되는 사이트는 expected-fail로 처리 (warning만, exit code 0 유지).
// 사람이 브라우저로는 정상 접속되지만 GH Actions IP / 자동화 헤더에서 차단되는 경우 한정.
const EXPECTED_FAILS = new Set([
  // 예: "https://example.com/",
]);

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
let expectedFailed = 0;
console.log("");
console.log("status  ms     url");
console.log("------  -----  ------------------------------------");
for (const r of results) {
  let tag;
  if (r.ok) tag = "OK    ";
  else if (EXPECTED_FAILS.has(r.url)) {
    tag = "WARN  ";
    expectedFailed++;
  } else {
    tag = "FAIL  ";
    failed++;
  }
  const ms = String(r.ms).padStart(5, " ");
  console.log(`${tag}  ${ms}  ${r.url}${r.note ? "  (" + r.note + ")" : ""}`);
}
console.log("");
console.log(
  `[check-cert-urls] ${results.length - failed - expectedFailed} OK, ${expectedFailed} expected-fail (warning), ${failed} FAIL`
);

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
  // 정부·기관 사이트들이 HEAD를 자주 막으니 GET을 먼저, 실패 시 HEAD로 fallback.
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
  };

  for (const method of ["GET", "HEAD"]) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers,
      });
      const ms = Date.now() - start;
      const ok = res.status >= 200 && res.status < 400;
      if (ok || method === "HEAD") {
        return {
          url,
          status: res.status,
          ok,
          ms,
          method,
          note: ok ? "" : `HTTP ${res.status}`,
        };
      }
    } catch (e) {
      if (method === "HEAD") {
        return {
          url,
          status: 0,
          ok: false,
          ms: Date.now() - start,
          method,
          note: e.name === "AbortError" ? "timeout" : (e.message || "error").slice(0, 80),
        };
      }
    } finally {
      clearTimeout(t);
    }
  }
  return { url, status: 0, ok: false, ms: Date.now() - start, method: "?", note: "all methods failed" };
}
