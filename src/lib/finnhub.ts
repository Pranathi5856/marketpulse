// Thin client for Finnhub's free tier. All quote fetching happens in the worker
// (src/worker/poller.ts), never inside a request handler — that's what keeps
// the app from making N provider calls for N simultaneous page loads.

const BASE = "https://finnhub.io/api/v1";
const TOKEN = process.env.FINNHUB_API_KEY;

export type FinnhubQuote = {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
};

export type FinnhubNews = {
  headline: string;
  source: string;
  url: string;
  datetime: number;
};

export type FinnhubProfile = { finnhubIndustry?: string };

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!TOKEN) throw new Error("FINNHUB_API_KEY is not set");
  const qs = new URLSearchParams({ ...params, token: TOKEN });
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Finnhub ${path} failed: ${res.status}`);
  return res.json();
}

export async function getQuote(symbol: string): Promise<FinnhubQuote> {
  return finnhubFetch<FinnhubQuote>("/quote", { symbol });
}

export async function searchSymbol(query: string) {
  return finnhubFetch<{ result: { symbol: string; description: string; type: string }[] }>(
    "/search",
    { q: query }
  );
}

export async function getCandles(symbol: string, fromUnix: number, toUnix: number) {
  // Used by the worker to seed 52w high/low and average volume/range stats.
  return finnhubFetch<{
    c: number[];
    h: number[];
    l: number[];
    v: number[];
    t: number[];
    s: string;
  }>("/stock/candle", {
    symbol,
    resolution: "D",
    from: String(fromUnix),
    to: String(toUnix),
  });
}

export async function getCompanyNews(symbol: string, from: string, to: string) {
  return finnhubFetch<FinnhubNews[]>("/company-news", { symbol, from, to });
}

export async function getCompanyProfile(symbol: string) {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}
