export interface ParsedQuestion {
  rawNumber: string;            // 모델이 붙인 ### Q{n} 의 n
  stem: string;                 // 발문
  choices: string[];            // 선택지 텍스트 (1번부터 순서대로)
  answer: string;               // 정답 (보통 "1"~"4", 모르면 "?")
  explanation: string;          // 해설
  rawBlock: string;             // 원본 응답 중 이 문제 블록 그대로
}

/**
 * mistral 응답에서 `### Q{n}` 단위로 문제 블록을 잘라 파싱한다.
 *
 * 기대 포맷 (assets/prompts/03_structure.md):
 *   ### Q3
 *   <발문>
 *
 *   #### 1) <선택지1>
 *   #### 2) <선택지2>
 *   #### 3) <선택지3>
 *   #### 4) <선택지4>
 *
 *   ##### 정답: 3
 *
 *   ###### 해설: ...
 *
 * 응답에 frontmatter나 코드펜스가 섞여 있어도 헤딩 패턴만 추출한다.
 */
export function parseStructuredOutput(text: string): ParsedQuestion[] {
  // 코드펜스 ```...``` 안에 들어있는 경우가 흔하므로 펜스 제거
  const stripped = text.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

  const blocks = splitByQuestionHeading(stripped);
  const results: ParsedQuestion[] = [];
  for (const block of blocks) {
    const q = parseSingleBlock(block);
    if (q) results.push(q);
  }
  return results;
}

function splitByQuestionHeading(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let inQuestion = false;
  const headingRe = /^###\s+Q\s*\d+/i;

  for (const line of lines) {
    if (headingRe.test(line)) {
      if (inQuestion && current.length) blocks.push(current.join("\n"));
      current = [line];
      inQuestion = true;
    } else if (inQuestion) {
      current.push(line);
    }
  }
  if (inQuestion && current.length) blocks.push(current.join("\n"));
  return blocks;
}

function parseSingleBlock(block: string): ParsedQuestion | null {
  const headingMatch = block.match(/^###\s+Q\s*(\d+)/i);
  if (!headingMatch) return null;
  const rawNumber = headingMatch[1];

  const lines = block.split(/\r?\n/);
  const stemLines: string[] = [];
  const choices: string[] = [];
  let answer = "?";
  const explanationLines: string[] = [];

  type Section = "stem" | "choices" | "answer" | "explanation";
  let section: Section = "stem";

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const choiceMatch = line.match(/^####\s*(\d+)[).]\s*(.*)$/);
    const answerMatch = line.match(/^#####\s*정답\s*[:：]?\s*(.*)$/);
    const explanationMatch = line.match(/^######\s*해설\s*[:：]?\s*(.*)$/);

    if (choiceMatch) {
      section = "choices";
      choices.push(choiceMatch[2].trim());
      continue;
    }
    if (answerMatch) {
      section = "answer";
      answer = answerMatch[1].trim() || "?";
      continue;
    }
    if (explanationMatch) {
      section = "explanation";
      const tail = explanationMatch[1].trim();
      if (tail) explanationLines.push(tail);
      continue;
    }

    if (section === "stem") stemLines.push(line);
    else if (section === "explanation") explanationLines.push(line);
    // choices/answer 섹션의 추가 라인은 다음 헤딩 전까지 무시 (간헐적 노이즈 대비)
  }

  const stem = stemLines.join("\n").trim();
  const explanation = explanationLines.join("\n").trim();

  // 정답 정규화: "정답: 3", "③", "3번" 등에서 1~4 한 자리 추출 시도
  const aMatch = answer.match(/[1-4①②③④]/);
  if (aMatch) {
    const ch = aMatch[0];
    answer = "①②③④".includes(ch) ? String("①②③④".indexOf(ch) + 1) : ch;
  } else {
    answer = "?";
  }

  if (!stem || choices.length === 0) return null;

  return {
    rawNumber,
    stem,
    choices,
    answer,
    explanation,
    rawBlock: block.trim(),
  };
}
