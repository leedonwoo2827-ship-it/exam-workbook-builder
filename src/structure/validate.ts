import type { ParsedQuestion } from "./parseModel";

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationConfig {
  choicesRequired: number;            // 기본 4
  answerRequired: boolean;             // 기본 true
  explanationMinChars: number;         // 기본 30
}

export const DEFAULT_VALIDATION: ValidationConfig = {
  choicesRequired: 4,
  answerRequired: true,
  explanationMinChars: 30,
};

export function validateQuestion(
  q: ParsedQuestion,
  cfg: ValidationConfig = DEFAULT_VALIDATION
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (q.choices.length !== cfg.choicesRequired) {
    errors.push(`선택지 개수 ${q.choices.length}개 (기대 ${cfg.choicesRequired})`);
  }
  for (let i = 0; i < q.choices.length; i++) {
    if (!q.choices[i] || q.choices[i].length < 1) {
      errors.push(`선택지 ${i + 1} 비어있음`);
    }
  }
  if (cfg.answerRequired && (q.answer === "?" || !q.answer)) {
    errors.push("정답 누락");
  } else if (q.answer !== "?") {
    const n = parseInt(q.answer, 10);
    if (!isFinite(n) || n < 1 || n > q.choices.length) {
      errors.push(`정답 번호 ${q.answer}가 선택지 범위(1~${q.choices.length}) 밖`);
    }
  }
  if (q.explanation.length < cfg.explanationMinChars) {
    warnings.push(`해설 길이 ${q.explanation.length}자 (권장 ${cfg.explanationMinChars}자 이상)`);
  }
  if (!q.stem || q.stem.length < 5) {
    errors.push("발문이 너무 짧거나 비어있음");
  }

  return { passed: errors.length === 0, errors, warnings };
}
