/**
 * Market scoring engine.
 * Score = 0.4 * Demand + 0.4 * Monetization + 0.2 * Execution
 *
 * Demand       = 0.6 * volume + 0.4 * trend
 * Monetization = cpc * (1 - competition)
 * Execution    = (1 - prodCost) * (1 - policyRisk)
 *
 * All inputs are normalized to [0, 1].
 */

export interface MarketScoreInput {
  volume: number;       // Monthly search volume, normalized 0-1
  trend: number;        // Growth trend, normalized 0-1
  cpc: number;          // Estimated CPC, normalized 0-1
  competition: number;  // Competition level 0-1 (1 = highest)
  policyRisk: number;   // Policy/legal risk 0-1 (1 = highest risk)
  prodCost: number;     // Production cost 0-1 (1 = most expensive)
}

export interface MarketScoreBreakdown {
  demand: number;
  monetization: number;
  execution: number;
  total: number;
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function calculateMarketScore(
  input: MarketScoreInput
): MarketScoreBreakdown {
  const v = clamp(input.volume);
  const t = clamp(input.trend);
  const c = clamp(input.cpc);
  const comp = clamp(input.competition);
  const pr = clamp(input.policyRisk);
  const pc = clamp(input.prodCost);

  const demand = 0.6 * v + 0.4 * t;
  const monetization = c * (1 - comp);
  const execution = (1 - pc) * (1 - pr);
  const total = 0.4 * demand + 0.4 * monetization + 0.2 * execution;

  return {
    demand: Math.round(demand * 100) / 100,
    monetization: Math.round(monetization * 100) / 100,
    execution: Math.round(execution * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function gradeScore(total: number): {
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  color: string;
} {
  if (total >= 0.7)
    return { grade: "S", label: "最優先", color: "text-green-600" };
  if (total >= 0.55)
    return { grade: "A", label: "優先", color: "text-blue-600" };
  if (total >= 0.4)
    return { grade: "B", label: "検討", color: "text-yellow-600" };
  if (total >= 0.25)
    return { grade: "C", label: "低優先", color: "text-orange-600" };
  return { grade: "D", label: "非推奨", color: "text-red-600" };
}

/** Normalize raw values into 0-1 range given the min/max of the dataset. */
export function minMaxNormalize(
  values: number[]
): (value: number) => number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return () => 0.5;
  return (v: number) => (v - min) / (max - min);
}
