import { llmChatWithSystem } from "@/lib/ai/router";
import { SYSTEM_QC_CHECKER, buildQCPrompt } from "./templates";
import type { QCResult, LLMConfig } from "@/types";

interface QCInput {
  title?: string;
  content: string;
  hook?: string;
  cta?: string;
  hashtags?: string;
  platform: string;
  prRequired: boolean;
}

export async function runAutoQC(
  draft: QCInput,
  llmConfig: Partial<LLMConfig> = {}
): Promise<QCResult> {
  const userPrompt = buildQCPrompt(draft);

  const raw = await llmChatWithSystem(
    SYSTEM_QC_CHECKER,
    userPrompt,
    { ...llmConfig, temperature: 0.1 } // Low temp for consistent judgment
  );

  return parseQCResult(raw);
}

function parseQCResult(raw: string): QCResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // If JSON parsing fails, default to needing human review
    return {
      pass: false,
      riskLevel: "HIGH",
      issues: ["QCレスポンスの解析に失敗しました。人間のレビューが必要です。"],
      spamConcerns: [],
      copyrightConcerns: [],
      prRequired: false,
      suggestions: ["再生成または手動での確認をお勧めします。"],
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    pass: Boolean(parsed.pass),
    riskLevel: ["LOW", "MEDIUM", "HIGH"].includes(parsed.riskLevel)
      ? parsed.riskLevel
      : "MEDIUM",
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
    spamConcerns: Array.isArray(parsed.spamConcerns)
      ? parsed.spamConcerns.map(String)
      : [],
    copyrightConcerns: Array.isArray(parsed.copyrightConcerns)
      ? parsed.copyrightConcerns.map(String)
      : [],
    prRequired: Boolean(parsed.prRequired),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map(String)
      : [],
  };
}

/** Determine if a draft needs human review based on QC result */
export function needsHumanReview(qc: QCResult): boolean {
  return !qc.pass || qc.riskLevel === "HIGH";
}
