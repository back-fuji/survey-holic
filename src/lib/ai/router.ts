/**
 * LLM Router — switches between Claude and OpenAI based on config.
 * Provider can be overridden per-call or falls back to env default.
 */
import type { LLMMessage, LLMConfig, LLMProvider } from "@/types";
import { claudeChat, CLAUDE_MODELS } from "./claude";
import { openAIChat, OPENAI_MODELS } from "./openai";

function defaultProvider(): LLMProvider {
  const env = process.env.DEFAULT_LLM_PROVIDER;
  if (env === "openai" || env === "claude") return env;
  return "claude";
}

function resolveModel(provider: LLMProvider, model?: string): string {
  if (model) return model;
  return provider === "claude" ? CLAUDE_MODELS.default : OPENAI_MODELS.default;
}

export async function llmChat(
  messages: LLMMessage[],
  config: Partial<LLMConfig> = {}
): Promise<string> {
  const provider = config.provider ?? defaultProvider();
  const model = resolveModel(provider, config.model);
  const temperature = config.temperature ?? 0.7;
  const maxTokens = config.maxTokens ?? 2000;

  if (provider === "claude") {
    return claudeChat(messages, { model, temperature, maxTokens });
  } else {
    return openAIChat(messages, { model, temperature, maxTokens });
  }
}

export async function llmChatWithSystem(
  systemPrompt: string,
  userPrompt: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  return llmChat(messages, config);
}

export { CLAUDE_MODELS, OPENAI_MODELS };
