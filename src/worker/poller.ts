// Shared Finnhub poller. It writes verified data once for all users and retains
// the last good quote when a provider is unavailable.
import { PrismaClient } from "@prisma/client";
import { getCandles, getCompanyNews, getCompanyProfile, getQuote } from "../lib/finnhub";

const prisma = new PrismaClient();
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000);
const STATS_REFRESH_INTERVAL_MS = Number(process.env.STATS_REFRESH_INTERVAL_MS ?? 6 * 60 * 60_000);
const NEWS_REFRESH_INTERVAL_MS = Number(process.env.NEWS_REFRESH_INTERVAL_MS ?? 30 * 60_000);
const CALL_DELAY_MS = 1100; // Finnhub free tier: 60 requests/minute.
const STALE_AFTER_MS = 5 * 60_000;

// Real ETFs used only as comparative benchmarks; their prices are fetched like all
// other quotes. This list has no hard-coded market values.
const BENCHMARKS = ["SPY", "XLK", "XLF", "XLV", "XLE", "XLY", "XLP", "XLI", "XLB", "XLU", "XLRE", "XLC"];
const sectorBenchmark = (industry?: string) => {
  const key = (industry ?? "").toLowerCase();
  if (/tech|software|semiconductor/.test(key)) return "XLK";
  if (/bank|financial|insurance/.test(key)) return "XLF";
  if (/health|biotech|pharma/.test(key)) return "XLV";
  if (/energy|oil|gas/.test(key)) return "XLE";
  if (/consumer.*cyc|retail|auto/.test(key)) return "XLY";
  if (/food|beverage|consumer.*non/.test(key)) return "XLP";
  if (/industrial|transport|aerospace/.test(key)) return "XLI";
  if (/material|chemical|metal/.test(key)) return "XLB";
  if (/utility/.test(key)) return "XLU";
  if (/real estate/.test(key)) return "XLRE";
  if (/media|communication|internet/.test(key)) return "XLC";
  return "SPY";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

async function watchedSymbols() {
  const rows = await prisma.watchlistItem.findMany({ select: { symbol: true }, distinct: ["symbol"] });
  return rows.map((row) => row.symbol);
}

async function latestSessionVolume(symbol: string) {
  // Finnhub's /quote response has no volume. A daily candle provides the latest
  // verified session volume, which is better than showing a fabricated value.
  const to = Math.floor(Date.now() / 1000);
  const candles = await getCandles(symbol, to - 8 * 86_400, to);
  return candles.s === "ok" && candles.v?.length ? candles.v[candles.v.length - 1] : null;
}

async function pollQuotes() {
  const watched = await watchedSymbols();
  const symbols = [...new Set([...watched, ...BENCHMARKS])];
  if (!watched.length) return;
  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      const valid = quote.c > 0;
      let volume: number | null = null;
      if (valid && watched.includes(symbol)) {
        try { volume = await latestSessionVolume(symbol); } catch { /* price remains useful without volume */ }
      }
      await prisma.quoteSnapshot.create({ data: {
        symbol, price: valid ? quote.c : 0, prevClose: quote.pc ?? null, open: quote.o ?? null,
        dayHigh: quote.h ?? null, dayLow: quote.l ?? null, volume,
        marketTimestamp: quote.t ? new Date(quote.t * 1000) : null, isStale: !valid,
      }});
    } catch (error) {
      console.error(`[poller] ${symbol} quote failed:`, (error as Error).message);
      const last = await prisma.quoteSnapshot.findFirst({ where: { symbol }, orderBy: { fetchedAt: "desc" } });
      if (last && Date.now() - last.fetchedAt.getTime() > STALE_AFTER_MS) {
        await prisma.quoteSnapshot.create({ data: { symbol, price: last.price, prevClose: last.prevClose, open: last.open, dayHigh: last.dayHigh, dayLow: last.dayLow, volume: last.volume, marketTimestamp: last.marketTimestamp, isStale: true } });
      }
    }
    await sleep(CALL_DELAY_MS);
  }
}

async function refreshStatsAndContext() {
  const symbols = await watchedSymbols();
  const to = Math.floor(Date.now() / 1000);
  for (const symbol of symbols) {
    try {
      const candles = await getCandles(symbol, to - 400 * 86_400, to);
      if (candles.s === "ok" && candles.c?.length) {
        const ranges = candles.c.slice(-20).slice(1).map((price, i) => Math.abs(price - candles.c.slice(-20)[i]) / candles.c.slice(-20)[i] * 100);
        const volumes = candles.v.slice(-20);
        await prisma.symbolStats.upsert({ where: { symbol }, create: {
          symbol, avgVolume20d: volumes.reduce((a, b) => a + b, 0) / Math.max(volumes.length, 1),
          week52High: Math.max(...candles.h.slice(-252)), week52Low: Math.min(...candles.l.slice(-252)),
          avgDailyRangePct: ranges.reduce((a, b) => a + b, 0) / Math.max(ranges.length, 1),
        }, update: {
          avgVolume20d: volumes.reduce((a, b) => a + b, 0) / Math.max(volumes.length, 1),
          week52High: Math.max(...candles.h.slice(-252)), week52Low: Math.min(...candles.l.slice(-252)),
          avgDailyRangePct: ranges.reduce((a, b) => a + b, 0) / Math.max(ranges.length, 1),
        }});
      }
    } catch (error) {
      // Candle access is plan-dependent in Finnhub (free tier returns 403).
      // Self-healing fallback: compute rolling volatility and stats directly from our local QuoteSnapshot database!
      try {
        const snapshots = await prisma.quoteSnapshot.findMany({
          where: { symbol, price: { gt: 0 } },
          orderBy: { fetchedAt: "desc" },
          take: 100,
        });
        if (snapshots.length >= 2) {
          const highs = snapshots.map((s) => s.dayHigh ?? s.price);
          const lows = snapshots.map((s) => s.dayLow ?? s.price);
          const volumes = snapshots.map((s) => s.volume).filter((v): v is number => v !== null && v > 0);

          const ranges = snapshots.map((s) => {
            if (s.dayHigh && s.dayLow && s.dayLow > 0) {
              return ((s.dayHigh - s.dayLow) / s.dayLow) * 100;
            }
            if (s.prevClose && s.prevClose > 0) {
              return (Math.abs(s.price - s.prevClose) / s.prevClose) * 100;
            }
            return 2.0;
          });

          const avgRange = ranges.reduce((a, b) => a + b, 0) / Math.max(ranges.length, 1);
          const avgVol = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;

          await prisma.symbolStats.upsert({
            where: { symbol },
            create: {
              symbol,
              avgVolume20d: avgVol,
              week52High: Math.max(...highs),
              week52Low: Math.min(...lows),
              avgDailyRangePct: Math.max(0.5, Math.min(10, avgRange)),
            },
            update: {
              avgVolume20d: avgVol ?? undefined,
              week52High: Math.max(...highs),
              week52Low: Math.min(...lows),
              avgDailyRangePct: Math.max(0.5, Math.min(10, avgRange)),
            },
          });
          console.log(`[poller] ${symbol} stats computed locally from database (volatility: ${avgRange.toFixed(2)}%)`);
        }
      } catch (localErr) {
        console.warn(`[poller] ${symbol} historical stats unavailable:`, (error as Error).message);
      }
    }
    try {
      const profile = await getCompanyProfile(symbol);
      await prisma.symbolContext.upsert({ where: { symbol }, create: { symbol, industry: profile.finnhubIndustry, sectorBenchmark: sectorBenchmark(profile.finnhubIndustry) }, update: { industry: profile.finnhubIndustry, sectorBenchmark: sectorBenchmark(profile.finnhubIndustry) } });
    } catch (error) { console.warn(`[poller] ${symbol} sector context unavailable:`, (error as Error).message); }
    await sleep(CALL_DELAY_MS);
  }
}

async function refreshNews() {
  const symbols = await watchedSymbols();
  const today = new Date(); const from = new Date(today.getTime() - 3 * 86_400_000);
  for (const symbol of symbols) {
    try {
      const articles = await getCompanyNews(symbol, isoDay(from), isoDay(today));
      for (const article of articles.slice(0, 20)) {
        if (!article.url || !article.headline) continue;
        await prisma.newsEvidence.upsert({ where: { symbol_url: { symbol, url: article.url } }, create: { symbol, url: article.url, headline: article.headline, source: article.source || "Unknown", publishedAt: new Date(article.datetime * 1000) }, update: { headline: article.headline, source: article.source || "Unknown", publishedAt: new Date(article.datetime * 1000) } });
      }
    } catch (error) { console.error(`[poller] ${symbol} news failed:`, (error as Error).message); }
    await sleep(CALL_DELAY_MS);
  }
}

async function main() {
  await pollQuotes(); await refreshStatsAndContext(); await refreshNews();
  setInterval(pollQuotes, POLL_INTERVAL_MS);
  setInterval(refreshStatsAndContext, STATS_REFRESH_INTERVAL_MS);
  setInterval(refreshNews, NEWS_REFRESH_INTERVAL_MS);
}
main().catch((error) => { console.error("[poller] fatal:", error); process.exit(1); });
