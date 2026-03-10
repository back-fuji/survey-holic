import { prisma } from "@/lib/db/client";

async function getStats() {
  const [totalMarkets, totalDrafts, pendingApprovals, published, jobs] =
    await Promise.all([
      prisma.market.count(),
      prisma.contentDraft.count(),
      prisma.contentDraft.count({ where: { status: "NEEDS_HUMAN" } }),
      prisma.contentDraft.count({ where: { status: "PUBLISHED" } }),
      prisma.schedulerJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { status: true },
      }),
    ]);

  const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;
  const successJobRate =
    jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0;

  return { totalMarkets, totalDrafts, pendingApprovals, published, successJobRate };
}

async function getRecentDrafts() {
  return prisma.contentDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { market: { select: { name: true } } },
  });
}

export default async function DashboardPage() {
  const [stats, recentDrafts] = await Promise.all([getStats(), getRecentDrafts()]);

  const statCards = [
    { label: "市場候補", value: stats.totalMarkets, color: "text-blue-600" },
    { label: "下書き総数", value: stats.totalDrafts, color: "text-purple-600" },
    {
      label: "承認待ち",
      value: stats.pendingApprovals,
      color: "text-yellow-600",
    },
    { label: "投稿済み", value: stats.published, color: "text-green-600" },
    {
      label: "ジョブ成功率",
      value: `${stats.successJobRate}%`,
      color: "text-gray-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-gray-500 text-sm mt-1">
          市場選定 → AI生成 → 承認 → TikTok投稿の全工程を管理
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card text-center">
            <div className={`text-3xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline overview */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">パイプライン概要</h3>
        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          {[
            { label: "市場分析", href: "/market" },
            { label: "AI生成", href: "/content" },
            { label: "自動QC", href: "/content" },
            { label: "承認ゲート", href: "/queue" },
            { label: "TikTok投稿", href: "/queue" },
            { label: "計測", href: "/scheduler" },
          ].map((step, i, arr) => (
            <span key={step.label} className="flex items-center gap-2 whitespace-nowrap">
              <a
                href={step.href}
                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
              >
                {step.label}
              </a>
              {i < arr.length - 1 && (
                <span className="text-gray-400">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Recent drafts */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">最近の下書き</h3>
        {recentDrafts.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだ下書きがありません。
            <a href="/content" className="text-blue-600 hover:underline ml-1">
              コンテンツを生成する
            </a>
          </p>
        ) : (
          <div className="space-y-3">
            {recentDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {draft.title ?? draft.content.slice(0, 60) + "..."}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {draft.platform} · {draft.market?.name ?? "市場未設定"}
                  </div>
                </div>
                <StatusBadge status={draft.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    QC_PASSED: "bg-blue-100 text-blue-700",
    NEEDS_HUMAN: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    SCHEDULED: "bg-purple-100 text-purple-700",
    PUBLISHED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-700",
    FAILED: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    DRAFT: "下書き",
    QC_PASSED: "QC通過",
    NEEDS_HUMAN: "要確認",
    APPROVED: "承認済",
    SCHEDULED: "予約中",
    PUBLISHED: "投稿済",
    REJECTED: "却下",
    FAILED: "失敗",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}
