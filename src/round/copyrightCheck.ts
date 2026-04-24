/**
 * 신규 생성 문제와 원본 코퍼스의 5-gram 토큰 겹침을 측정한다.
 * 한국어 + 영문 혼재를 가정해 단순 단어 토큰화(공백/구두점 분리) 사용.
 *
 * 임계치 초과 시 호출부가 재생성을 요청한다.
 */
export interface OverlapResult {
  newTokens: number;
  newGrams: number;
  matched: number;
  ratio: number;            // matched / newGrams
  longestRunWords: number;  // 원본과 연속 일치한 최장 단어 수
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`*_#>~|<>"'\[\](){}\-]+/g, " ")
    .replace(/[.,!?;:]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function ngramSet(tokens: string[], n: number): Set<string> {
  const out = new Set<string>();
  if (tokens.length < n) return out;
  for (let i = 0; i <= tokens.length - n; i++) {
    out.add(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

/** 두 단어 시퀀스에서 가장 긴 연속 일치 길이. */
export function longestCommonRun(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const m = a.length;
  const n = b.length;
  // O(m) 메모리: 이전 행만 보관
  let prev = new Int32Array(n + 1);
  let best = 0;
  for (let i = 1; i <= m; i++) {
    const cur = new Int32Array(n + 1);
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

export function measureOverlap(newText: string, corpus: string, n = 5): OverlapResult {
  const newTokens = tokenize(newText);
  const corpusTokens = tokenize(corpus);
  const newGrams = ngramSet(newTokens, n);
  const corpusGrams = ngramSet(corpusTokens, n);
  let matched = 0;
  for (const g of newGrams) if (corpusGrams.has(g)) matched++;
  return {
    newTokens: newTokens.length,
    newGrams: newGrams.size,
    matched,
    ratio: newGrams.size > 0 ? matched / newGrams.size : 0,
    longestRunWords: longestCommonRun(newTokens, corpusTokens),
  };
}
