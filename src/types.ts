export interface WorkspaceSubPaths {
  overview: string;
  references: string;
  source: string;
  raw: string;
  structured: string;
  concepts: string;
  rounds: string;
  output: string;
  cache: string;
  review: string;
  subjectYaml: string;
}

export const DEFAULT_SUBPATHS: WorkspaceSubPaths = {
  overview: "00_시험개요.md",
  references: "00_참고자료",
  source: "01_원본",
  raw: "02_raw",
  structured: "03_structured",
  concepts: "04_concepts",
  rounds: "05_rounds",
  output: "06_output",
  cache: "_cache",
  review: "_review",
  subjectYaml: "subject.yaml",
};

export const REFERENCE_CATEGORIES = [
  "공식출제기준",
  "공식예시",
  "핵심개념정리",
  "함정오답패턴",
  "실무예제",
  "기출경향",
  "용어사전",
] as const;
