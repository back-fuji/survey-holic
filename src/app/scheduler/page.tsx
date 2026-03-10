"use client";

import { useState, useEffect, useCallback } from "react";

interface Job {
  id: string;
  jobType: string;
  status: string;
  runAt: string;
  completedAt: string | null;
  error: string | null;
  result: string | null;
  draft: {
    id: string;
    title: string | null;
    status: string;
    platform: string;
  } | null;
}

interface Market {
  id: string;
  name: string;
}

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({
    jobType: "GENERATE",
    marketId: "",
    theme: "",
    persona: "",
    pain: "",
    monetization: "アフィリエイト",
    count: 3,
    runAt: "",
  });

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/scheduler");
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }, []);

  const fetchMarkets = useCallback(async () => {
    const res = await fetch("/api/market");
    const data = await res.json();
    setMarkets(data.markets ?? []);
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchMarkets();
  }, [fetchJobs, fetchMarkets]);

  const runPending = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/scheduler?action=run", { method: "POST" });
      const data = await res.json();
      alert(`実行完了: ${data.results?.length ?? 0}件`);
      await fetchJobs();
    } finally {
      setRunning(false);
    }
  };

  const scheduleJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = form.jobType === "GENERATE"
      ? {
          marketId: form.marketId || undefined,
          theme: form.theme,
          persona: form.persona,
          pain: form.pain,
          monetization: form.monetization,
          count: form.count,
          platform: "TIKTOK",
          prRequired: false,
        }
      : {};

    await fetch("/api/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobType: form.jobType,
        payload,
        runAt: form.runAt ? new Date(form.runAt).toISOString() : new Date().toISOString(),
      }),
    });
    await fetchJobs();
  };

  const statusColor: Record<string, string> = {
    PENDING: "badge-medium",
    RUNNING: "bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium",
    COMPLETED: "badge-low",
    FAILED: "badge-high",
    DEAD_LETTER: "badge-high",
  };

  const typeLabels: Record<string, string> = {
    GENERATE: "コンテンツ生成",
    QC_CHECK: "QC実行",
    PUBLISH: "TikTok投稿",
    ANALYTICS_FETCH: "分析取得",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">スケジューラー</h2>
          <p className="text-sm text-gray-500 mt-1">
            ジョブのスケジュール管理・手動実行
          </p>
        </div>
        <button
          onClick={runPending}
          disabled={running}
          className="btn-primary"
        >
          {running ? "実行中..." : "待機中ジョブを今すぐ実行"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Schedule form */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">ジョブをスケジュール</h3>
          <form onSubmit={scheduleJob} className="space-y-4">
            <div>
              <label className="label">ジョブ種別</label>
              <select
                className="input"
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
              >
                <option value="GENERATE">コンテンツ生成</option>
                <option value="ANALYTICS_FETCH">分析データ取得</option>
              </select>
            </div>

            {form.jobType === "GENERATE" && (
              <>
                <div>
                  <label className="label">対象市場</label>
                  <select
                    className="input"
                    value={form.marketId}
                    onChange={(e) =>
                      setForm({ ...form, marketId: e.target.value })
                    }
                  >
                    <option value="">なし</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">テーマ</label>
                  <input
                    className="input"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                    placeholder="例: AI業務効率化"
                  />
                </div>
                <div>
                  <label className="label">ターゲット</label>
                  <input
                    className="input"
                    value={form.persona}
                    onChange={(e) => setForm({ ...form, persona: e.target.value })}
                    placeholder="例: 会社員・副業初心者"
                  />
                </div>
                <div>
                  <label className="label">悩み</label>
                  <input
                    className="input"
                    value={form.pain}
                    onChange={(e) => setForm({ ...form, pain: e.target.value })}
                    placeholder="例: 副業の始め方がわからない"
                  />
                </div>
                <div>
                  <label className="label">生成本数: {form.count}</label>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={form.count}
                    onChange={(e) =>
                      setForm({ ...form, count: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">実行日時（空欄 = 即時）</label>
              <input
                type="datetime-local"
                className="input"
                value={form.runAt}
                onChange={(e) => setForm({ ...form, runAt: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              ジョブを追加
            </button>
          </form>
        </div>

        {/* Job list */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">ジョブ履歴</h3>
            <button onClick={fetchJobs} className="btn-secondary text-xs">更新</button>
          </div>
          {jobs.length === 0 && (
            <div className="text-sm text-gray-400">ジョブがありません</div>
          )}
          {jobs.map((job) => (
            <div key={job.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">
                  {typeLabels[job.jobType] ?? job.jobType}
                </span>
                <span className={statusColor[job.status] ?? "badge-medium"}>
                  {job.status}
                </span>
              </div>
              {job.draft && (
                <div className="text-xs text-gray-500 mb-1">
                  ↳ {job.draft.title ?? "無題"} [{job.draft.platform}]
                </div>
              )}
              <div className="text-xs text-gray-400">
                実行予定: {new Date(job.runAt).toLocaleString("ja-JP")}
                {job.completedAt &&
                  ` · 完了: ${new Date(job.completedAt).toLocaleString("ja-JP")}`}
              </div>
              {job.error && (
                <div className="mt-1 text-xs text-red-600 bg-red-50 rounded p-1">
                  {job.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
