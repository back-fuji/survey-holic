import { llmChatWithSystem } from "@/lib/ai/router";
import {
  SYSTEM_CONTENT_GENERATOR,
  buildGeneratePrompt,
} from "./templates";
import type { GenerateRequest, LLMConfig } from "@/types";

export interface GeneratedDraft {
  title: string;
  hook: string;
  content: string;
  cta: string;
  hashtags: string[];
  originality: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  prNote: string;
}

export async function generateDrafts(
  request: GenerateRequest,
  llmConfig: Partial<LLMConfig> = {}
): Promise<GeneratedDraft[]> {
  const count = request.count ?? 3;

  const userPrompt = buildGeneratePrompt({
    platform: request.platform,
    theme: request.theme,
    persona: request.persona,
    pain: request.pain,
    monetization: request.monetization,
    prRequired: request.prRequired,
    count,
  });

  const raw = await llmChatWithSystem(
    SYSTEM_CONTENT_GENERATOR,
    userPrompt,
    { ...llmConfig, temperature: 0.8 }
  );

  return parseGeneratedDrafts(raw);
}

function parseGeneratedDrafts(raw: string): GeneratedDraft[] {
  // Extract JSON array from the response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse generated drafts: no JSON array found");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error("Generated drafts is not an array");
  }

  return parsed.map((item) => ({
    title: String(item.title ?? ""),
    hook: String(item.hook ?? ""),
    content: String(item.content ?? ""),
    cta: String(item.cta ?? ""),
    hashtags: Array.isArray(item.hashtags)
      ? item.hashtags.map(String)
      : [],
    originality: String(item.originality ?? ""),
    riskLevel: ["LOW", "MEDIUM", "HIGH"].includes(item.riskLevel)
      ? item.riskLevel
      : "MEDIUM",
    prNote: String(item.prNote ?? ""),
  }));
}
