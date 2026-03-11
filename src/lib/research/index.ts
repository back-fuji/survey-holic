/**
 * Market Research Orchestrator
 * Separates AI-knowledge analysis from real-time web scraping,
 * and tracks token usage per section.
 */

import { llmChatWithSystemAndUsage, type ClaudeUsage } from "@/lib/ai/router";
import { fetchAllWebData, type WebSnippet } from "./web-scraper";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export interface TokenUsage extends ClaudeUsage {
  estimatedCostUSD: number; // Based on claude-sonnet-4-6 pricing
}

export interface AiKnowledgeSection {
  overview: string;
  trends: string[];
  monetization: string[];
  entryBarriers: string[];
  recommendations: string[];
  usage: TokenUsage;
}

export interface WebDataSection {
  rawSnippets: WebSnippet[];
  analysis: {
    currentTrends: string[];
    competitors: string[];
    keywords: string[];
    insights: string[];
  };
  usage: TokenUsage;
  fetchedAt: string;
}

export interface ResearchResult {
  theme: string;
  aiKnowledge: AiKnowledgeSection;
  webData: WebDataSection;
  tokenSummary: {
    aiKnowledgeTokens: number;
    webAnalysisTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
  };
}

// claude-sonnet-4-6: $3/M input, $15/M output
function estimateCost(usage: ClaudeUsage): number {
  return (usage.inputTokens / 1_000_000) * 3 + (usage.outputTokens / 1_000_000) * 15;
}

// ----------------------------------------------------------------
// Section 1: AI Knowledge Analysis
// ----------------------------------------------------------------
const AI_KNOWLEDGE_SYSTEM = `あなたは市場調査の専門アナリストです。
AIが学習した知識ベースから、指定されたテーマについて分析を行います。
回答は必ずJSON形式で出力してください。`;

async function runAiKnowledgeAnalysis(theme: string): Promise<AiKnowledgeSection> {
  const userPrompt = `
テーマ「${theme}」について、AIの知識ベース（学習データ）に基づいた市場分析を行ってください。
注意: ここではWebの最新情報は使用せず、学習済み知識のみで回答してください。

以下のJSON形式で出力してください:
{
  "overview": "市場の概要（2〜3文）",
  "trends": ["トレンド1", "トレンド2", "トレンド3"],
  "monetization": ["収益化方法1", "収益化方法2", "収益化方法3"],
  "entryBarriers": ["参入障壁1", "参入障壁2"],
  "recommendations": ["推奨アクション1", "推奨アクション2", "推奨アクション3"]
}`;

  const { text, usage } = await llmChatWithSystemAndUsage(
    AI_KNOWLEDGE_SYSTEM,
    userPrompt,
    { temperature: 0.4, maxTokens: 1500 }
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI knowledge analysis: JSON not found");

  const parsed = JSON.parse(jsonMatch[0]);
  const tokenUsage: TokenUsage = { ...usage, estimatedCostUSD: estimateCost(usage) };

  return {
    overview: String(parsed.overview ?? ""),
    trends: Array.isArray(parsed.trends) ? parsed.trends.map(String) : [],
    monetization: Array.isArray(parsed.monetization) ? parsed.monetization.map(String) : [],
    entryBarriers: Array.isArray(parsed.entryBarriers) ? parsed.entryBarriers.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
    usage: tokenUsage,
  };
}

// ----------------------------------------------------------------
// Section 2: Web Scraping + Claude Analysis
// ----------------------------------------------------------------
const WEB_ANALYSIS_SYSTEM = `あなたは市場調査の専門アナリストです。
提供されたWebスクレイピングデータを分析し、最新のトレンドや競合状況を抽出します。
回答は必ずJSON形式で出力してください。`;

async function runWebDataAnalysis(theme: string, snippets: WebSnippet[]): Promise<WebDataSection["analysis"] & { usage: TokenUsage }> {
  const fetchedAt = new Date().toISOString();

  if (snippets.length === 0) {
    return {
      currentTrends: [],
      competitors: [],
      keywords: [],
      insights: ["Webデータを取得できませんでした（APIキー未設定またはネットワークエラー）"],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUSD: 0 },
    };
  }

  const webContext = snippets
    .map((s) => `[${s.sourceLabel}] ${s.title}: ${s.content}${s.url ? ` (${s.url})` : ""}`)
    .join("\n");

  const userPrompt = `
テーマ「${theme}」に関連して取得したWebデータです:

${webContext}

このデータを分析し、以下のJSON形式で出力してください:
{
  "currentTrends": ["現在のトレンド1", "現在のトレンド2", "現在のトレンド3"],
  "competitors": ["競合・関連サービス1", "競合2"],
  "keywords": ["重要キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"],
  "insights": ["最新情報から得られたインサイト1", "インサイト2", "インサイト3"]
}`;

  const { text, usage } = await llmChatWithSystemAndUsage(
    WEB_ANALYSIS_SYSTEM,
    userPrompt,
    { temperature: 0.3, maxTokens: 1200 }
  );

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Web analysis: JSON not found");

  const parsed = JSON.parse(jsonMatch[0]);
  const tokenUsage: TokenUsage = { ...usage, estimatedCostUSD: estimateCost(usage) };

  return {
    currentTrends: Array.isArray(parsed.currentTrends) ? parsed.currentTrends.map(String) : [],
    competitors: Array.isArray(parsed.competitors) ? parsed.competitors.map(String) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
    usage: tokenUsage,
  };
}

// ----------------------------------------------------------------
// Main Export
// ----------------------------------------------------------------
export async function researchMarket(theme: string): Promise<ResearchResult> {
  // Fetch web data and run AI knowledge analysis in parallel
  const [snippets, aiKnowledge] = await Promise.all([
    fetchAllWebData(theme),
    runAiKnowledgeAnalysis(theme),
  ]);

  const { usage: webUsage, ...webAnalysis } = await runWebDataAnalysis(theme, snippets);

  const totalTokens = aiKnowledge.usage.totalTokens + webUsage.totalTokens;

  return {
    theme,
    aiKnowledge,
    webData: {
      rawSnippets: snippets,
      analysis: webAnalysis,
      usage: webUsage,
      fetchedAt: new Date().toISOString(),
    },
    tokenSummary: {
      aiKnowledgeTokens: aiKnowledge.usage.totalTokens,
      webAnalysisTokens: webUsage.totalTokens,
      totalTokens,
      estimatedCostUSD: aiKnowledge.usage.estimatedCostUSD + webUsage.estimatedCostUSD,
    },
  };
}
