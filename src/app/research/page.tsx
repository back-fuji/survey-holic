"use client";

import { useState } from "react";
import type { ResearchResult } from "@/lib/research";

// ----------------------------------------------------------------
// Token badge: shows tokens + source label for each section
// ----------------------------------------------------------------
function TokenBadge({
  label,
  tokens,
  color = "blue",
}: {
  label: string;
  tokens: number;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${colorMap[color]}`}
    >
      {label} · {tokens.toLocaleString()} tokens
    </span>
  );
}

// ----------------------------------------------------------------
// Source chip: shows which scraping source data came from
// ----------------------------------------------------------------
const SOURCE_STYLE: Record<string, { bg: string; label: string }> = {
  brave_search: { bg: "bg-orange-100 text-orange-700", label: "Brave Search" },
  google_suggest: { bg: "bg-blue-100 text-blue-700", label: "Google 関連検索" },
  google_trends_rss: { bg: "bg-green-100 text-green-700", label: "Google トレンド" },
};

function SourceChip({ source }: { source: string }) {
  const s = SOURCE_STYLE[source] ?? { bg: "bg-gray-100 text-gray-600", label: source };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${s.bg}`}>
      {s.label}
    </span>
  );
}

// ----------------------------------------------------------------
// Token Summary Modal
// ----------------------------------------------------------------
function TokenSummaryModal({
  result,
  onClose,
}: {
  result: ResearchResult;
  onClose: () => void;
}) {
  const { tokenSummary, aiKnowledge, webData } = result;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">トークン使用量サマリー</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          {/* AI Knowledge row */}
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-blue-800">AIナレッジ分析</div>
              <div className="text-xs text-blue-600 mt-0.5">
                入力: {aiKnowledge.usage.inputTokens.toLocaleString()} / 出力: {aiKnowledge.usage.outputTokens.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-700 font-mono">
                {aiKnowledge.usage.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-blue-500">tokens</div>
            </div>
          </div>

          {/* Web Analysis row */}
          <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-green-800">Web分析（{webData.rawSnippets.length}件取得）</div>
              <div className="text-xs text-green-600 mt-0.5">
                入力: {webData.usage.inputTokens.toLocaleString()} / 出力: {webData.usage.outputTokens.toLocaleString()}
              </div>
              <div className="text-xs text-green-600 mt-0.5 flex flex-wrap gap-1">
                {[...new Set(webData.rawSnippets.map((s) => s.source))].map((src) => (
                  <SourceChip key={src} source={src} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-700 font-mono">
                {webData.usage.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-green-500">tokens</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">合計</div>
              <div className="text-xs text-gray-500">
                推定コスト: ${tokenSummary.estimatedCostUSD.toFixed(5)} USD
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 font-mono">
                {tokenSummary.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">tokens</div>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary w-full">閉じる</button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------
export default function ResearchPage() {
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Research failed");
      }
      const data: ResearchResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">市場リサーチ</h2>
        <p className="text-sm text-gray-500 mt-1">
          AIナレッジ（学習データ）とWebスクレイピング（リアルタイム）を分けて分析し、トークン使用量を可視化します
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleResearch} className="card flex gap-3 items-end">
        <div className="flex-1">
          <label className="label">リサーチテーマ</label>
          <input
            className="input"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="例: AI副業・TikTokマーケティング・ダイエットサプリ"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
          {loading ? "リサーチ中..." : "リサーチ開始"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="card text-sm text-gray-500 text-center py-12 space-y-2">
          <div className="text-4xl">🔍</div>
          <div>AIナレッジ分析 + Webスクレイピングを並行実行中...</div>
          <div className="text-xs text-gray-400">Brave Search / Google トレンドを取得しています</div>
        </div>
      )}

      {result && (
        <>
          {/* Header row with summary button */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">
              「{result.theme}」のリサーチ結果
            </h3>
            <button
              onClick={() => setShowSummary(true)}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <span>📊</span>
              トークン使用量サマリー（合計 {result.tokenSummary.totalTokens.toLocaleString()} tokens）
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Section 1: AI Knowledge ── */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span>🧠</span> AIナレッジ分析
                </h4>
                <TokenBadge
                  label="AI知識"
                  tokens={result.aiKnowledge.usage.totalTokens}
                  color="blue"
                />
              </div>
              <p className="text-xs text-gray-400">
                ソース: Claude 学習データ（リアルタイムWeb情報なし）
              </p>

              <div>
                <p className="text-sm text-gray-700">{result.aiKnowledge.overview}</p>
              </div>

              {result.aiKnowledge.trends.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">トレンド</div>
                  <ul className="text-sm space-y-1">
                    {result.aiKnowledge.trends.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">▸</span>
                        <span className="text-gray-700">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiKnowledge.monetization.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">収益化方法</div>
                  <ul className="text-sm space-y-1">
                    {result.aiKnowledge.monetization.map((m, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">▸</span>
                        <span className="text-gray-700">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiKnowledge.entryBarriers.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">参入障壁</div>
                  <ul className="text-sm space-y-1">
                    {result.aiKnowledge.entryBarriers.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">▸</span>
                        <span className="text-gray-700">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiKnowledge.recommendations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">推奨アクション</div>
                  <ul className="text-sm space-y-1">
                    {result.aiKnowledge.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">✓</span>
                        <span className="text-gray-700">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Token detail */}
              <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-600 font-mono">
                入力: {result.aiKnowledge.usage.inputTokens.toLocaleString()} / 出力: {result.aiKnowledge.usage.outputTokens.toLocaleString()} / 推定: ${result.aiKnowledge.usage.estimatedCostUSD.toFixed(5)}
              </div>
            </div>

            {/* ── Section 2: Web Scraping ── */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span>🌐</span> Webリアルタイム分析
                </h4>
                <TokenBadge
                  label="Web分析"
                  tokens={result.webData.usage.totalTokens}
                  color="green"
                />
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                取得元:
                {[...new Set(result.webData.rawSnippets.map((s) => s.source))].map((src) => (
                  <SourceChip key={src} source={src} />
                ))}
                {result.webData.rawSnippets.length === 0 && (
                  <span className="text-yellow-600">データなし（Brave APIキー未設定）</span>
                )}
                <span className="ml-auto text-gray-300">
                  {new Date(result.webData.fetchedAt).toLocaleTimeString("ja-JP")} 取得
                </span>
              </div>

              {/* Raw snippets */}
              {result.webData.rawSnippets.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">取得データ（生）</div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.webData.rawSnippets.map((s, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <SourceChip source={s.source} />
                          <span className="font-medium text-gray-700 truncate">{s.title}</span>
                        </div>
                        <p className="text-gray-500 line-clamp-2">{s.content}</p>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline truncate block mt-1"
                          >
                            {s.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claude analysis of web data */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Claude によるWeb分析結果
                </div>

                {result.webData.analysis.currentTrends.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">現在のトレンド</div>
                    <ul className="text-sm space-y-1">
                      {result.webData.analysis.currentTrends.map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">▸</span>
                          <span className="text-gray-700">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.webData.analysis.keywords.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">重要キーワード</div>
                    <div className="flex flex-wrap gap-1">
                      {result.webData.analysis.keywords.map((k, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.webData.analysis.insights.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">インサイト</div>
                    <ul className="text-sm space-y-1">
                      {result.webData.analysis.insights.map((ins, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">✦</span>
                          <span className="text-gray-700">{ins}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.webData.analysis.competitors.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">競合・関連サービス</div>
                    <ul className="text-sm space-y-1">
                      {result.webData.analysis.competitors.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-400 mt-0.5">▸</span>
                          <span className="text-gray-700">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Token detail */}
              <div className="bg-green-50 rounded-lg p-2 text-xs text-green-600 font-mono">
                入力: {result.webData.usage.inputTokens.toLocaleString()} / 出力: {result.webData.usage.outputTokens.toLocaleString()} / 推定: ${result.webData.usage.estimatedCostUSD.toFixed(5)}
              </div>
            </div>
          </div>

          {/* Inline summary bar */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">合計トークン:</span>
            <span className="font-mono font-bold text-gray-900">
              {result.tokenSummary.totalTokens.toLocaleString()}
            </span>
            <TokenBadge label="AIナレッジ" tokens={result.tokenSummary.aiKnowledgeTokens} color="blue" />
            <TokenBadge label="Web分析" tokens={result.tokenSummary.webAnalysisTokens} color="green" />
            <span className="ml-auto text-xs text-gray-400">
              推定コスト: ${result.tokenSummary.estimatedCostUSD.toFixed(5)} USD
            </span>
          </div>
        </>
      )}

      {showSummary && result && (
        <TokenSummaryModal result={result} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
