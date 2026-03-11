/**
 * テスト用: 市場を1件確保し、選定済みのターゲット向けコンテンツを3件挿入する
 * Run: node scripts/seed-test-content.js (from project root, .env must have DATABASE_URL)
 */
const path = require("path");
const fs = require("fs");

// Load .env from project root
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const qcPassed = {
  pass: true,
  riskLevel: "LOW",
  issues: [],
  spamConcerns: [],
  copyrightConcerns: [],
  prRequired: false,
  suggestions: ["CTAをより具体的にすると転換率が上がる可能性があります。"],
};

const qcNeedsHuman = {
  pass: false,
  riskLevel: "MEDIUM",
  issues: ["効能表現をやや控えめにすることを推奨します。"],
  spamConcerns: [],
  copyrightConcerns: [],
  prRequired: false,
  suggestions: ["「〇〇が治る」ではなく「〇〇が気になる方に」などに変更を推奨。"],
};

async function main() {
  // 1) 市場を1件取得 or 作成（選定済みの想定）
  let market = await prisma.market.findFirst();
  if (!market) {
    market = await prisma.market.create({
      data: {
        name: "副業・AI収益化（20-40代会社員）",
        description: "副業でAIツールを活用した収益化ニーズ。需要・トレンド高め。",
        volume: 0.75,
        trend: 0.7,
        cpc: 0.6,
        competition: 0.5,
        policyRisk: 0.2,
        prodCost: 0.3,
        score: 0.68,
        notes: "テスト用に作成した市場",
      },
    });
    console.log("Created market:", market.name);
  } else {
    console.log("Using existing market:", market.name);
  }

  // 2) テスト用コンテンツ3件（TikTok想定・ターゲット: 会社員・副業初心者）
  const drafts = [
    {
      marketId: market.id,
      platform: "TIKTOK",
      status: "QC_PASSED",
      riskLevel: "LOW",
      title: "副業で月3万稼いだ方法、全部話す",
      hook: "副業って何から始めればいいかわからない人、絶対この動画保存して。",
      content: `結論から言うと、私は「AIツール×情報発信」で月3万の副収入を達成しました。
まず0-2秒で、あなたの「副業やりたいけど何から手をつけていいかわからない」という悩みに共感します。
2-8秒で、今日の学びは「AIで下書きを作って、自分で肉付けするだけ」という再現性の高い方法です。
8-40秒で、実際に私が使っているツールと、1本の動画を作るまでの3ステップを具体的に話します。
40-55秒で、手順をまとめます。①テーマを決める ②AIで台本の骨子を作る ③自分の体験を1つ入れて編集。
55-60秒で、保存とフォローをお願いします。`,
      cta: "保存してあとで見返してね。フォローすると次の動画で「収益化の始め方」話すよ。",
      hashtags: JSON.stringify(["副業", "AI", "収益化", "会社員", "副業初心者"]),
      prRequired: false,
      qcResult: JSON.stringify(qcPassed),
    },
    {
      marketId: market.id,
      platform: "TIKTOK",
      status: "NEEDS_HUMAN",
      riskLevel: "MEDIUM",
      title: "節約術で毎月2万浮かせた",
      hook: "お金貯まらない人、この方法なら確実に浮く。",
      content: `私は家計を見直して毎月2万円ほど支出を減らしました。
ポイントは「固定費」「変動費」「ムダ遣い」の3つを一度にやらないこと。
まず固定費から。スマホ・保険・サブスクを1つずつ見直しました。
次に変動費。食費は週1回まとめ買い、光熱費は使い方のクセを直しました。
最後にムダ遣い。欲しいものは3日リストに入れてから買うルールにしました。
効能を謳うわけじゃないですが、実体験として「浮いた」感覚は大きいです。
保存して、自分用にアレンジしてみてください。`,
      cta: "保存して週末に家計チェックしてみて。フォローで続きの節約ネタ出します。",
      hashtags: JSON.stringify(["節約", "家計", "貯金", "固定費", "副業"]),
      prRequired: false,
      qcResult: JSON.stringify(qcNeedsHuman),
    },
    {
      marketId: market.id,
      platform: "TIKTOK",
      status: "QC_PASSED",
      riskLevel: "LOW",
      title: "副業で最初にやるべき1つだけ",
      hook: "副業、やりたいのに動けない人。今日は「これ1つ」だけやればOK。",
      content: `副業で最初にやるべきことは「自分が解決できる悩みを1つ言語化する」だけです。
「稼ぎ方」より先に、「誰のどんな悩みに答えられるか」を決めると、コンテンツが続きます。
私の場合は「副業初心者が何から手をつけていいかわからない」でした。
そこから逆算して、AIで台本の骨子を作り、自分の体験を1つ入れる形で動画を出しました。
再現性を出すために、手順は3ステップに絞っています。
まずは1本、この「1つ」を決めるところから始めてみてください。`,
      cta: "この動画保存して、明日までに「自分が解決できる悩み1つ」メモしてね。フォローで次のステップ話す。",
      hashtags: JSON.stringify(["副業", "副業初心者", "コンテンツ", "AI", "稼ぐ"]),
      prRequired: false,
      qcResult: JSON.stringify(qcPassed),
    },
  ];

  for (const d of drafts) {
    const created = await prisma.contentDraft.create({ data: d });
    console.log("Created draft:", created.title ?? created.id);
  }

  console.log("Done. Test content: 1 market, 3 drafts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
