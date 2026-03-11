/**
 * Web Scraper — Brave Search API + Google public endpoints
 * No third-party npm packages; uses Node.js native fetch.
 */

export type WebSourceType = "brave_search" | "google_suggest" | "google_trends_rss";

export interface WebSnippet {
  source: WebSourceType;
  sourceLabel: string;
  title: string;
  content: string;
  url?: string;
}

// ----------------------------------------------------------------
// Brave Search API
// ----------------------------------------------------------------
interface BraveWebResult {
  title: string;
  description: string;
  url: string;
}

interface BraveResponse {
  web?: { results?: BraveWebResult[] };
}

export async function fetchBraveSearch(query: string, count = 5): Promise<WebSnippet[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("country", "jp");
  url.searchParams.set("search_lang", "ja");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return [];

  const data: BraveResponse = await res.json();
  return (data.web?.results ?? []).map((r) => ({
    source: "brave_search",
    sourceLabel: "Brave Search",
    title: r.title,
    content: r.description,
    url: r.url,
  }));
}

// ----------------------------------------------------------------
// Google Autocomplete / Related Queries (public, no key)
// ----------------------------------------------------------------
export async function fetchGoogleSuggest(query: string): Promise<WebSnippet[]> {
  const url = `https://suggestqueries.google.com/complete/search?output=json&hl=ja&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];

    // Response is JSONP-like: window.google.ac.h(["query",[["suggestion","0",{...}],...]])
    const text = await res.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) return [];

    const suggestions = (parsed[1] as unknown[])
      .slice(0, 8)
      .map((item) => (Array.isArray(item) ? String(item[0]) : ""))
      .filter(Boolean);

    if (suggestions.length === 0) return [];

    return [
      {
        source: "google_suggest",
        sourceLabel: "Google 関連検索",
        title: `「${query}」の関連キーワード`,
        content: suggestions.join(" / "),
      },
    ];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------
// Google Trends Daily RSS (Japan, free, no key)
// ----------------------------------------------------------------
export async function fetchGoogleTrendsRSS(): Promise<WebSnippet[]> {
  try {
    const res = await fetch(
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=JP",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return [];

    const text = await res.text();
    const titles: string[] = [];

    // Parse <title> from RSS items (simple regex; no DOM parser available in edge)
    const itemMatches = text.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<\/item>/g);
    for (const m of itemMatches) {
      titles.push(m[1]);
      if (titles.length >= 10) break;
    }

    if (titles.length === 0) return [];

    return [
      {
        source: "google_trends_rss",
        sourceLabel: "Google トレンド (JP)",
        title: "日本の急上昇トレンド",
        content: titles.join(" / "),
      },
    ];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------
// Orchestrator — fetch all sources in parallel
// ----------------------------------------------------------------
export async function fetchAllWebData(theme: string): Promise<WebSnippet[]> {
  const [brave, suggest, trends] = await Promise.all([
    fetchBraveSearch(theme),
    fetchGoogleSuggest(theme),
    fetchGoogleTrendsRSS(),
  ]);

  return [...brave, ...suggest, ...trends];
}
