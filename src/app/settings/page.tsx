"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">設定</h2>
        <p className="text-sm text-gray-500 mt-1">
          APIキーはサーバー側の環境変数（.env.local）で管理します
        </p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">必要な環境変数</h3>
        <div className="space-y-4 text-sm">
          {[
            {
              key: "DATABASE_URL",
              desc: "SQLiteのパス。例: file:./dev.db",
              required: true,
            },
            {
              key: "ANTHROPIC_API_KEY",
              desc: "Claude APIキー (Anthropic Console)",
              required: false,
            },
            {
              key: "OPENAI_API_KEY",
              desc: "OpenAI APIキー",
              required: false,
            },
            {
              key: "DEFAULT_LLM_PROVIDER",
              desc: 'デフォルトLLM: "claude" または "openai"',
              required: false,
            },
            {
              key: "TIKTOK_ACCESS_TOKEN",
              desc: "TikTok Content Posting APIのアクセストークン",
              required: false,
            },
            {
              key: "TIKTOK_TEST_VIDEO_URL",
              desc: "スケジューラーのテスト用動画URL（PULL_FROM_URL形式）",
              required: false,
            },
          ].map((env) => (
            <div
              key={env.key}
              className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <code className="text-blue-700 font-mono text-xs bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                {env.key}
              </code>
              <div className="flex-1">
                <p className="text-gray-700">{env.desc}</p>
              </div>
              <span
                className={
                  env.required
                    ? "badge-high"
                    : "text-xs text-gray-400"
                }
              >
                {env.required ? "必須" : "任意"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">LLMルーター仕様</h3>
        <div className="text-sm space-y-2 text-gray-600">
          <p>
            <code className="bg-gray-100 px-1 rounded">DEFAULT_LLM_PROVIDER</code>{" "}
            環境変数でデフォルトプロバイダーを設定。
          </p>
          <p>コンテンツ生成フォームでリクエストごとにClaudeとOpenAIを切り替えられます。</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500">用途</th>
                  <th className="text-left py-2 text-gray-500">Claude デフォルト</th>
                  <th className="text-left py-2 text-gray-500">OpenAI デフォルト</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  ["コンテンツ生成", "claude-sonnet-4-6", "gpt-4o"],
                  ["QCチェック", "claude-sonnet-4-6", "gpt-4o"],
                  ["市場分析", "claude-sonnet-4-6", "gpt-4o"],
                ].map(([use, claude, openai]) => (
                  <tr key={use} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">{use}</td>
                    <td className="py-1.5 font-mono text-blue-600">{claude}</td>
                    <td className="py-1.5 font-mono text-green-600">{openai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">TikTok API セットアップ</h3>
        <ol className="text-sm space-y-2 text-gray-600 list-decimal list-inside">
          <li>
            TikTok for Developers でアプリを作成し、Content Posting API を有効化
          </li>
          <li>OAuth 2.0 でユーザー認証し、Access Token を取得</li>
          <li>
            取得した Access Token を{" "}
            <code className="bg-gray-100 px-1 rounded">TIKTOK_ACCESS_TOKEN</code>{" "}
            に設定
          </li>
          <li>
            動画は公開アクセス可能なURLが必要（PULL_FROM_URL方式）
          </li>
        </ol>
      </div>
    </div>
  );
}
