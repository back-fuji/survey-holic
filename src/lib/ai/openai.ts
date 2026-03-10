import OpenAI from "openai";
import type { LLMMessage } from "@/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const OPENAI_MODELS = {
  default: "gpt-4o",
  fast: "gpt-4o-mini",
  powerful: "gpt-4o",
} as const;

export async function openAIChat(
  messages: LLMMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = OPENAI_MODELS.default,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}
