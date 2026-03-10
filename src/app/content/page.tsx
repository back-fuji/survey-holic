"use client";

import { useState, useEffect, useCallback } from "react";

interface Market {
  id: string;
  name: string;
  score: number;
}

interface Draft {
  id: string;
  title: string | null;
  content: string;
  hook: string | null;
  cta: string | null;
  hashtags: string | null;
  status: string;
  riskLevel: string;
  platform: string;
  prRequired: boolean;
  qcResult: string | null;
  createdAt: string;
  market: { id: string; name: string } | null;
}

const defaultForm = {
  marketId: "",
  platform: "TIKTOK" as const,
  theme: "",
  persona: "",
  pain: "",
  monetization: "アフィリエイト",
  prRequired: false,
  provider: "claude" as "claude" | "openai",
  count: 3,
};

export default function ContentPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMarkets = useCallback(async () => {
    const res = await fetch("/api/market");
    const data = await res.json();
    setMarkets(data.markets ?? []);
  }, []);

  const fetchDrafts = useCallback(async () => {
    const res = await fetch("/api/content");
    const data = await res.json();
    setDrafts(data.drafts ?? []);
  }, []);

  useEffect(() => {
    fetchMarkets();
    fetchDrafts();
  }, [fetchMarkets, fetchDrafts]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.error));
      }
      await fetchDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">コンテンツ生成</h2>
        <p className="text-sm text-gray-500 mt-1">
          AIでTikTok用コンテンツを生成し、自動QCで品質チェックします
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generate form */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">コンテンツを生成</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="label">対象市場（任意）</label>
              <select
                className="input"
                value={form.marketId}
                onChange={(e) => setForm({ ...form, marketId: e.target.value })}
              >
                <option value="">市場を選択（任意）</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (スコア: {(m.score * 100).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">プラットフォーム</label>
              <select
                className="input"
                value={form.platform}
                onChange={(e) =>
                  setForm({ ...form, platform: e.target.value as typeof form.platform })
                }
              >
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="X">X (Twitter)</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>

            <div>
              <label className="label">テーマ *</label>
              <input
                className="input"
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value })}
                placeholder="例: 副業でAIを使った収益化"
                required
              />
            </div>

            <div>
              <label className="label">ターゲット視聴者 *</label>
              <input
                className="input"
                value={form.persona}
                onChange={(e) => setForm({ ...form, persona: e.target.value })}
                placeholder="例: 会社員・副業初心者・20〜35歳"
                required
              />
            </div>

            <div>
              <label className="label">解決する悩み *</label>
              <textarea
                className="input"
                rows={2}
                value={form.pain}
                onChange={(e) => setForm({ ...form, pain: e.target.value })}
                placeholder="例: 副業を始めたいが何から手を付けていいかわからない"
                required
              />
            </div>

            <div>
              <label className="label">収益導線</label>
              <input
                className="input"
                value={form.monetization}
                onChange={(e) =>
                  setForm({ ...form, monetization: e.target.value })
                }
                placeholder="例: アフィリエイト / 自社テンプレ販売 / リード獲得"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prRequired"
                  checked={form.prRequired}
                  onChange={(e) =>
                    setForm({ ...form, prRequired: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="prRequired" className="text-sm text-gray-700">
                  PR表記が必要
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">AIモデル:</label>
                <select
                  className="input"
                  value={form.provider}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      provider: e.target.value as typeof form.provider,
                    })
                  }
                >
                  <option value="claude">Claude</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">生成本数: {form.count}</label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={form.count}
                onChange={(e) =>
                  setForm({ ...form, count: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? "生成中（QCまで数秒かかります）..."
                : "AIでコンテンツを生成 + 自動QC"}
            </button>
          </form>
        </div>

        {/* Draft list */}
        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">下書き一覧</h3>
            <button onClick={fetchDrafts} className="btn-secondary text-xs">
              更新
            </button>
          </div>
          {drafts.length === 0 && (
            <div className="text-sm text-gray-400">まだ下書きがありません</div>
          )}
          {drafts.map((draft) => {
            const qc = draft.qcResult ? JSON.parse(draft.qcResult) : null;
            const hashtags: string[] = draft.hashtags
              ? JSON.parse(draft.hashtags)
              : [];
            return (
              <div key={draft.id} className="card text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <StatusBadge status={draft.status} />
                    <span className="ml-2 text-xs text-gray-400">
                      {draft.platform} · {draft.market?.name ?? "市場未設定"}
                    </span>
                  </div>
                  <RiskBadge risk={draft.riskLevel} />
                </div>
                {draft.hook && (
                  <p className="font-medium text-gray-900 mb-1">{draft.hook}</p>
                )}
                <p className="text-gray-600 text-xs line-clamp-3">{draft.content}</p>
                {hashtags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hashtags.slice(0, 5).map((h) => (
                      <span key={h} className="text-xs text-blue-500">#{h}</span>
                    ))}
                  </div>
                )}
                {qc && qc.issues?.length > 0 && (
                  <div className="mt-2 bg-yellow-50 rounded p-2 text-xs text-yellow-700">
                    {qc.issues.slice(0, 2).map((issue: string, i: number) => (
                      <div key={i}>⚠ {issue}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "badge-medium",
    QC_PASSED: "badge-low",
    NEEDS_HUMAN: "badge-high",
    APPROVED: "badge-low",
    PUBLISHED: "badge-low",
    REJECTED: "badge-high",
  };
  const labels: Record<string, string> = {
    DRAFT: "下書き", QC_PASSED: "QC通過", NEEDS_HUMAN: "要確認",
    APPROVED: "承認済", PUBLISHED: "投稿済", REJECTED: "却下",
  };
  return (
    <span className={map[status] ?? "badge-medium"}>{labels[status] ?? status}</span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high",
  };
  const labels: Record<string, string> = { LOW: "低リスク", MEDIUM: "中リスク", HIGH: "高リスク" };
  return <span className={map[risk] ?? "badge-medium"}>{labels[risk] ?? risk}</span>;
}
