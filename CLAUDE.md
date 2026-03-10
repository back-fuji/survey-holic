# CLAUDE.md — Survey-Holic

SNS収益化AI基盤。市場選定 → AIコンテンツ生成 → 承認ゲート → TikTok自動投稿 のパイプラインを管理する Next.js アプリ。

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: SQLite via Prisma（本番は PostgreSQL に切り替え可）
- **AI**: Anthropic Claude API + OpenAI API（LLMルーターで切り替え可）
- **SNS**: TikTok Content Posting API
- **UI**: Tailwind CSS

## Directory Structure

```
src/
├── app/
│   ├── page.tsx            # ダッシュボード
│   ├── market/page.tsx     # 市場スコアリング
│   ├── content/page.tsx    # コンテンツ生成
│   ├── queue/page.tsx      # 承認キュー
│   ├── scheduler/page.tsx  # スケジューラー
│   ├── settings/page.tsx   # 設定
│   └── api/                # API Routes
│       ├── market/         # GET/POST /api/market, PATCH/DELETE /api/market/[id]
│       ├── content/        # GET /api/content, POST /api/content/generate, POST /api/content/approve
│       ├── publish/tiktok/ # POST /api/publish/tiktok
│       └── scheduler/      # GET/POST /api/scheduler, POST /api/scheduler?action=run
├── lib/
│   ├── ai/
│   │   ├── router.ts       # LLMルーター (Claude/OpenAI 切り替え)
│   │   ├── claude.ts       # Anthropic SDK ラッパー
│   │   └── openai.ts       # OpenAI SDK ラッパー
│   ├── market/scoring.ts   # 市場スコアリング計算
│   ├── content/
│   │   ├── generator.ts    # AI生成
│   │   ├── qc.ts           # 自動QC
│   │   └── templates.ts    # プロンプトテンプレート
│   ├── platforms/tiktok.ts # TikTok API クライアント
│   ├── scheduler/runner.ts # ジョブランナー
│   └── db/client.ts        # Prisma クライアント
└── types/index.ts          # 共通型定義
```

## Setup

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数を設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# 3. DBセットアップ
npm run db:push

# 4. 開発サーバー起動
npm run dev
```

## Common Commands

```bash
npm run dev          # 開発サーバー起動 (http://localhost:3000)
npm run build        # プロダクションビルド
npm run db:push      # Prismaスキーマを DB に反映
npm run db:studio    # Prisma Studio (DB GUI)
npm run db:migrate   # マイグレーション作成・適用
```

## Architecture Notes

### LLM Router
`src/lib/ai/router.ts` がClaudeとOpenAIを抽象化。
- `DEFAULT_LLM_PROVIDER` env変数でデフォルト設定
- 各API呼び出しで `provider` を指定してオーバーライド可

### Market Scoring Formula
```
Score = 0.4 * Demand + 0.4 * Monetization + 0.2 * Execution

Demand       = 0.6 * volume + 0.4 * trend
Monetization = cpc * (1 - competition)
Execution    = (1 - prodCost) * (1 - policyRisk)
```
全入力値は 0-1 に正規化済み。

### Content Pipeline
```
Generate → Auto QC → [NEEDS_HUMAN or QC_PASSED]
                          ↓ (承認キュー for NEEDS_HUMAN)
                       APPROVED → TikTok Publish
```
- 生成直後に自動QCを実行
- `riskLevel=HIGH` または `qc.pass=false` → `NEEDS_HUMAN`
- それ以外 → `QC_PASSED`（低リスク枠は自動投稿も可）

### TikTok Integration
- PULL_FROM_URL 方式（動画は公開URLが必要）
- Direct Post: `TikTokClient.publishByUrl()` でステータスをポーリング
- 承認キューから直接投稿 or スケジューラーで予約投稿

### Scheduler
- `POST /api/scheduler?action=run` で待機中ジョブを処理
- 本番では Cloud Scheduler / cron で定期実行する
- ジョブタイプ: `GENERATE`, `QC_CHECK`, `PUBLISH`, `ANALYTICS_FETCH`

## Policy Compliance

- YouTubeは「反復・大量生産的コンテンツ」が収益化対象外になり得るため、生成コンテンツには必ず独自性（実体験/検証/独自データ）を含める
- PR/広告表記は `prRequired` フラグで管理（景品表示法対応）
- 医療・金融の断定表現はプロンプトで禁止
- TikTokポリシー: スパム/欺瞞/大量自動化を避けるため承認ゲートを必須とする

## Environment Variables

| 変数名 | 説明 | 必須 |
|---|---|---|
| `DATABASE_URL` | SQLite path (e.g. `file:./dev.db`) | ✅ |
| `ANTHROPIC_API_KEY` | Claude API キー | Claude使用時 |
| `OPENAI_API_KEY` | OpenAI API キー | OpenAI使用時 |
| `DEFAULT_LLM_PROVIDER` | `"claude"` or `"openai"` | いいえ |
| `TIKTOK_ACCESS_TOKEN` | TikTok OAuth アクセストークン | TikTok投稿時 |
| `TIKTOK_TEST_VIDEO_URL` | テスト用動画URL | テスト時 |
