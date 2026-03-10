// Platform types
export type Platform = "TIKTOK" | "YOUTUBE" | "X" | "INSTAGRAM";

// Draft status
export type DraftStatus =
  | "DRAFT"
  | "QC_PASSED"
  | "NEEDS_HUMAN"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "REJECTED"
  | "FAILED";

// Risk level
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// Job types
export type JobType = "GENERATE" | "QC_CHECK" | "PUBLISH" | "ANALYTICS_FETCH";
export type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DEAD_LETTER";

// LLM Provider
export type LLMProvider = "claude" | "openai";

// Market metrics input
export interface MarketMetricsInput {
  name: string;
  description?: string;
  volume: number; // 0-1 normalized
  trend: number; // 0-1 normalized
  cpc: number; // 0-1 normalized
  competition: number; // 0-1 (higher = more competition)
  policyRisk: number; // 0-1 (higher = more risk)
  prodCost: number; // 0-1 (higher = more expensive)
  notes?: string;
}

// QC Result
export interface QCResult {
  pass: boolean;
  riskLevel: RiskLevel;
  issues: string[];
  spamConcerns: string[];
  copyrightConcerns: string[];
  prRequired: boolean;
  suggestions: string[];
}

// LLM Message
export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// LLM Config
export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Content generation request
export interface GenerateRequest {
  marketId?: string;
  platform: Platform;
  theme: string;
  persona: string;
  pain: string;
  monetization: string;
  prRequired: boolean;
  provider?: LLMProvider;
  count?: number;
}

// TikTok publish result
export interface TikTokPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  shareUrl?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalMarkets: number;
  totalDrafts: number;
  pendingApprovals: number;
  published: number;
  successJobRate: number;
}
