/**
 * Prompt templates for content generation and QC.
 * All templates are in Japanese for the Japanese market.
 */

export const SYSTEM_CONTENT_GENERATOR = `あなたはSNS収益化の専門家兼編集長です。
日本市場向けに、プラットフォームポリシーを遵守した高品質なコンテンツを生成します。

重要な制約:
- 医療・金融の断定表現は使用禁止
- 誇大広告・虚偽表現は禁止
- 他者の著作物の無断転載は禁止
- ステルスマーケティングは禁止（PR/広告表記を必ず含める）
- TikTokのCreator Rewards要件: オリジナルコンテンツ、1分以上推奨

必ず「独自性の根拠」（実体験/検証/独自データ）を各コンテンツに含めてください。`;

export const SYSTEM_QC_CHECKER = `あなたはプラットフォームポリシー監査官です。
SNSプラットフォームのポリシーと日本の法律（景表法・薬機法・金融商品取引法等）に基づき、
投稿コンテンツを厳格に審査します。

審査観点:
1. TikTokポリシー: スパム/欺瞞/自動生成コンテンツの禁止
2. 景品表示法: 誇大広告・ステルスマーケティングの禁止
3. 著作権: 転載・盗用・二次利用の問題
4. 薬機法: 健康・美容分野での効能断定
5. 金融: 投資・節約での収益断定
6. 反復性: テンプレ的・大量生産的な表現の検知`;

export const SYSTEM_MARKET_ANALYST = `あなたは日本市場のSNS収益化専門アナリストです。
Keyword Planner・Google Trends・公的統計のデータを解析し、
「需要×収益性×実行可能性」を総合評価します。`;

export function buildGeneratePrompt(params: {
  platform: string;
  theme: string;
  persona: string;
  pain: string;
  monetization: string;
  prRequired: boolean;
  count: number;
}): string {
  return `
プラットフォーム: ${params.platform}
テーマ: ${params.theme}
ターゲット視聴者: ${params.persona}
解決する悩み: ${params.pain}
収益導線: ${params.monetization}
PR表記必要: ${params.prRequired ? "はい（先頭に「#PR」を付ける）" : "いいえ"}

以下の形式で${params.count}本のコンテンツを生成してください。

【出力形式（JSON配列）】
[
  {
    "title": "タイトル（TikTokフック的に）",
    "hook": "最初の2秒で視聴者を引き込む一言",
    "content": "本文（${params.platform === "TIKTOK" ? "台本/ナレーション形式" : "投稿テキスト"}）",
    "cta": "行動喚起（保存/フォロー/リンク等）",
    "hashtags": ["タグ1", "タグ2", "タグ3"],
    "originality": "独自性の根拠（実体験/検証/独自データ）",
    "riskLevel": "LOW | MEDIUM | HIGH",
    "prNote": "${params.prRequired ? "#PR を先頭に含める" : "なし"}"
  }
]

各コンテンツの構成（TikTok 60秒想定）:
- 0-2秒: 視聴者の痛み/違和感
- 2-8秒: 結論（今日の学び）
- 8-40秒: 根拠（あなたの検証/経験/具体例）
- 40-55秒: 手順（再現可能な3ステップ）
- 55-60秒: CTA（保存/フォロー/リンク）

禁止: 医療断定・投資断定・誇大表現・転載
必須: オリジナル要素を必ず1つ入れる
`;
}

export function buildQCPrompt(draft: {
  title?: string;
  content: string;
  hook?: string;
  cta?: string;
  hashtags?: string;
  platform: string;
  prRequired: boolean;
}): string {
  return `
以下のSNS投稿案を審査してください。

【投稿情報】
プラットフォーム: ${draft.platform}
タイトル: ${draft.title ?? "なし"}
フック: ${draft.hook ?? "なし"}
本文: ${draft.content}
CTA: ${draft.cta ?? "なし"}
ハッシュタグ: ${draft.hashtags ?? "なし"}
PR表記必要: ${draft.prRequired ? "はい" : "いいえ"}

【出力形式（JSON）】
{
  "pass": true | false,
  "riskLevel": "LOW | MEDIUM | HIGH",
  "issues": ["問題点1", "問題点2"],
  "spamConcerns": ["スパム/欺瞞の懸念点"],
  "copyrightConcerns": ["著作権・転載リスク"],
  "prRequired": true | false,
  "suggestions": ["改善案1", "改善案2"]
}

pass=falseの条件:
- 医療・投資の断定表現がある
- 明らかな誇大広告
- PR表記が必要なのに含まれていない
- スパム的な反復表現
- 著作権侵害の疑い
`;
}
