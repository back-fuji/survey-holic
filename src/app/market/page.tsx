"use client";

import { useState, useEffect, useCallback } from "react";
import { gradeScore, type MarketScoreBreakdown } from "@/lib/market/scoring";

interface Market {
  id: string;
  name: string;
  description?: string;
  volume: number;
  trend: number;
  cpc: number;
  competition: number;
  policyRisk: number;
  prodCost: number;
  score: number;
  notes?: string;
  createdAt: string;
  _count?: { drafts: number };
}

const defaultForm = {
  name: "",
  description: "",
  volume: 0.5,
  trend: 0.5,
  cpc: 0.5,
  competition: 0.5,
  policyRisk: 0.3,
  prodCost: 0.3,
  notes: "",
};

export default function MarketPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MarketScoreBreakdown | null>(null);

  const fetchMarkets = useCallback(async () => {
    const res = await fetch("/api/market");
    const data = await res.json();
    setMarkets(data.markets ?? []);
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Live score preview
  useEffect(() => {
    const { calculateMarketScore } = require("@/lib/market/scoring");
    const score = calculateMarketScore(form);
    setPreview(score);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create market");
      setForm(defaultForm);
      await fetchMarkets();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この市場を削除しますか？")) return;
    await fetch(`/api/market/${id}`, { method: "DELETE" });
    await fetchMarkets();
  };

  const sliders = [
    { key: "volume", label: "月間需要（0=低, 1=高）", color: "blue" },
    { key: "trend", label: "成長トレンド（0=低, 1=高）", color: "blue" },
    { key: "cpc", label: "CPC・収益性（0=低, 1=高）", color: "green" },
    { key: "competition", label: "競合の強さ（0=低, 1=高）", color: "orange" },
    { key: "policyRisk", label: "規約・法務リスク（0=低, 1=高）", color: "red" },
    { key: "prodCost", label: "制作コスト（0=低, 1=高）", color: "red" },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">市場スコアリング</h2>
        <p className="text-sm text-gray-500 mt-1">
          需要 × 収益性 × 実行可能性で市場を評価し、優先順位を確定します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">市場を追加</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">市場名 *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: AI業務効率化ツール"
                required
              />
            </div>
            <div>
              <label className="label">説明</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="例: ビジネスパーソン向けAI活用術"
              />
            </div>

            {sliders.map((s) => (
              <div key={s.key}>
                <label className="label">
                  {s.label}: {form[s.key].toFixed(2)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form[s.key]}
                  onChange={(e) =>
                    setForm({ ...form, [s.key]: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            ))}

            <div>
              <label className="label">メモ</label>
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="調査メモ・根拠など"
              />
            </div>

            {/* Live preview */}
            {preview && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">予測スコア:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(preview.total * 100).toFixed(0)}
                  </span>
                  <span className="text-gray-400">/ 100</span>
                  <GradeChip score={preview.total} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>需要: {(preview.demand * 100).toFixed(0)}</div>
                  <div>収益: {(preview.monetization * 100).toFixed(0)}</div>
                  <div>実行: {(preview.execution * 100).toFixed(0)}</div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "登録中..." : "市場を追加"}
            </button>
          </form>
        </div>

        {/* Market list */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">市場一覧（スコア順）</h3>
          {markets.length === 0 && (
            <div className="text-sm text-gray-400">まだ市場がありません</div>
          )}
          {markets.map((m) => {
            const g = gradeScore(m.score);
            return (
              <div key={m.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{m.name}</span>
                      <GradeChip score={m.score} />
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${g.color}`}>
                      {(m.score * 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-400">スコア</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div>需要: {(m.volume * 100).toFixed(0)} / トレンド: {(m.trend * 100).toFixed(0)}</div>
                  <div>CPC: {(m.cpc * 100).toFixed(0)} / 競合: {(m.competition * 100).toFixed(0)}</div>
                  <div>リスク: {(m.policyRisk * 100).toFixed(0)} / コスト: {(m.prodCost * 100).toFixed(0)}</div>
                </div>
                {m.notes && (
                  <p className="text-xs text-gray-400 mt-2 italic">{m.notes}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>下書き: {m._count?.drafts ?? 0}件</span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GradeChip({ score }: { score: number }) {
  const g = gradeScore(score);
  const bg: Record<string, string> = {
    S: "bg-green-100 text-green-700",
    A: "bg-blue-100 text-blue-700",
    B: "bg-yellow-100 text-yellow-700",
    C: "bg-orange-100 text-orange-700",
    D: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold ${bg[g.grade]}`}>
      {g.grade} · {g.label}
    </span>
  );
}
