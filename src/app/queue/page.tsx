"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function QueuePage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scheduledAt, setScheduledAt] = useState<Record<string, string>>({});
  const [videoUrl, setVideoUrl] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/content?status=NEEDS_HUMAN");
    const data = await res.json();
    setDrafts(data.drafts ?? []);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const approve = async (draftId: string, scheduled: boolean) => {
    setLoading(true);
    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action: "approve",
          humanNote: notes[draftId] ?? undefined,
          scheduledAt: scheduled && scheduledAt[draftId]
            ? new Date(scheduledAt[draftId]).toISOString()
            : undefined,
        }),
      });
      await fetchQueue();
    } finally {
      setLoading(false);
    }
  };

  const reject = async (draftId: string) => {
    setLoading(true);
    try {
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          action: "reject",
          humanNote: notes[draftId] ?? undefined,
        }),
      });
      await fetchQueue();
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async (draftId: string) => {
    const url = videoUrl[draftId];
    if (!url) return alert("動画URLを入力してください");
    setPublishing({ ...publishing, [draftId]: true });
    try {
      // First approve, then publish
      await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action: "approve" }),
      });
      const res = await fetch("/api/publish/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, videoUrl: url }),
      });
      const data = await res.json();
      if (data.result?.success) {
        alert("投稿成功！");
      } else {
        alert("投稿失敗: " + (data.result?.error ?? "Unknown error"));
      }
      await fetchQueue();
    } finally {
      setPublishing({ ...publishing, [draftId]: false });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">承認キュー</h2>
          <p className="text-sm text-gray-500 mt-1">
            QCで「要確認」となった投稿を人間がレビューします
          </p>
        </div>
        <button onClick={fetchQueue} className="btn-secondary">
          更新
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-500">承認待ちの投稿はありません</div>
        </div>
      ) : (
        <div className="space-y-6">
          {drafts.map((draft) => {
            const qc = draft.qcResult ? JSON.parse(draft.qcResult) : null;
            const hashtags: string[] = draft.hashtags
              ? JSON.parse(draft.hashtags)
              : [];

            return (
              <div key={draft.id} className="card">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-high">要確認</span>
                      <span className="text-xs text-gray-400">
                        {draft.platform} · {draft.market?.name ?? "市場未設定"}
                      </span>
                    </div>
                    {draft.title && (
                      <h4 className="font-semibold text-gray-900">{draft.title}</h4>
                    )}
                  </div>
                  <RiskBadge risk={draft.riskLevel} />
                </div>

                {/* Content preview */}
                <div className="space-y-2 mb-4">
                  {draft.hook && (
                    <div className="bg-blue-50 rounded p-3 text-sm">
                      <span className="text-xs font-medium text-blue-600 uppercase">フック</span>
                      <p className="mt-1 text-gray-900">{draft.hook}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <span className="text-xs font-medium text-gray-500 uppercase">本文</span>
                    <p className="mt-1 text-gray-700 whitespace-pre-line">{draft.content}</p>
                  </div>
                  {draft.cta && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">CTA:</span> {draft.cta}
                    </div>
                  )}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hashtags.map((h) => (
                        <span key={h} className="text-xs text-blue-500">#{h}</span>
                      ))}
                    </div>
                  )}
                  {draft.prRequired && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      #PR 表記必要
                    </span>
                  )}
                </div>

                {/* QC issues */}
                {qc && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm space-y-2">
                    <div className="font-medium text-yellow-800">QC指摘事項</div>
                    {qc.issues?.map((issue: string, i: number) => (
                      <div key={i} className="text-yellow-700">⚠ {issue}</div>
                    ))}
                    {qc.spamConcerns?.map((s: string, i: number) => (
                      <div key={i} className="text-red-700">🚫 {s}</div>
                    ))}
                    {qc.suggestions?.map((s: string, i: number) => (
                      <div key={i} className="text-green-700">💡 {s}</div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <div>
                    <label className="label">レビューメモ</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={notes[draft.id] ?? ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [draft.id]: e.target.value })
                      }
                      placeholder="承認・却下の理由や修正指示"
                    />
                  </div>

                  <div>
                    <label className="label">予約投稿日時（任意）</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={scheduledAt[draft.id] ?? ""}
                      onChange={(e) =>
                        setScheduledAt({
                          ...scheduledAt,
                          [draft.id]: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">動画URL（即時投稿用）</label>
                    <input
                      type="url"
                      className="input"
                      value={videoUrl[draft.id] ?? ""}
                      onChange={(e) =>
                        setVideoUrl({ ...videoUrl, [draft.id]: e.target.value })
                      }
                      placeholder="https://... (TikTok PULL_FROM_URL)"
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => approve(draft.id, false)}
                      disabled={loading}
                      className="btn-success"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => approve(draft.id, true)}
                      disabled={loading || !scheduledAt[draft.id]}
                      className="btn-primary"
                    >
                      予約承認
                    </button>
                    <button
                      onClick={() => publishNow(draft.id)}
                      disabled={publishing[draft.id] || !videoUrl[draft.id]}
                      className="btn-primary"
                    >
                      {publishing[draft.id] ? "投稿中..." : "今すぐ投稿 (TikTok)"}
                    </button>
                    <button
                      onClick={() => reject(draft.id)}
                      disabled={loading}
                      className="btn-danger"
                    >
                      却下
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    LOW: "badge-low", MEDIUM: "badge-medium", HIGH: "badge-high",
  };
  const labels: Record<string, string> = { LOW: "低リスク", MEDIUM: "中リスク", HIGH: "高リスク" };
  return <span className={map[risk] ?? "badge-medium"}>{labels[risk] ?? risk}</span>;
}
