import Anthropic from "@anthropic-ai/sdk";
import type { LLMMessage } from "@/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const CLAUDE_MODELS = {
  default: "claude-sonnet-4-6",
  fast: "claude-haiku-4-5-20251001",
  powerful: "claude-opus-4-6",
} as const;

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export async function claudeChat(
  messages: LLMMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<string> {
  const { text } = await claudeChatWithUsage(messages, options);
  return text;
}

export async function claudeChatWithUsage(
  messages: LLMMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<{ text: string; usage: ClaudeUsage }> {
  const {
    model = CLAUDE_MODELS.default,
    temperature = 0.7,
    maxTokens = 2000,
    systemPrompt,
  } = options;

  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const systemFromMessages = messages.find((m) => m.role === "system");
  const finalSystem = systemPrompt ?? systemFromMessages?.content;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(finalSystem ? { system: finalSystem } : {}),
    messages: apiMessages,
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");

  const usage: ClaudeUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  };

  return { text: block.text, usage };
}
