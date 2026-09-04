import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { computeChange } from "@/lib/changeDetection";
import { demoWatchlist } from "@/lib/demo";

const STALE_THRESHOLD_MS = 5 * 60_000;
const pctBetween = (current: number | null, baseline: number | null) => current && baseline && baseline > 0 ? ((current - baseline) / baseline) * 100 : null;

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (req.nextUrl.searchParams.get("mode") === "demo") return NextResponse.json({ items: demoWatchlist, mode: "demo" });

  const items = await prisma.watchlistItem.findMany({ where: { userId }, orderBy: { addedAt: "asc" } });
  const results = await Promise.all(items.map(async (item) => {
    const [latest, stats, context] = await Promise.all([
      prisma.quoteSnapshot.findFirst({ where: { symbol: item.symbol }, orderBy: { fetchedAt: "desc" } }),
      prisma.symbolStats.findUnique({ where: { symbol: item.symbol } }),
      prisma.symbolContext.findUnique({ where: { symbol: item.symbol } }),
    ]);
    if (!latest) return {
      symbol: item.symbol,
      notes: item.notes,
      addedAt: item.addedAt,
      price: null,
      previousPrice: null,
      volume: null,
      avgVolume20d: null,
      pctChangeSinceSeen: null,
      pctChangeToday: null,
      marketPctSinceSeen: null,
      sectorPctSinceSeen: null,
      sectorBenchmark: context?.sectorBenchmark ?? "SPY",
      meaningfulScore: 0,
      classification: "normal" as const,
      evidence: [],
      news: [],
      isStale: true,
      dataAvailable: false,
      timestamps: {
        previousSnapshot: item.lastSeenAt ? item.lastSeenAt.toISOString() : null,
        currentData: null,
        newBaseline: null,
      },
      previousSnapshotPrice: item.lastSeenPrice,
    };

    const sectorBenchmark = context?.sectorBenchmark ?? "SPY";

    // Baseline determination:
    // If item.lastSeenPrice is not yet set, or was stamped identical to current price (e.g. freshly added symbol):
    // use latest.prevClose (previous market session close) so the user has an immediate meaningful baseline!
    const baselinePrice = (item.lastSeenPrice && Math.abs(item.lastSeenPrice - latest.price) > 0.001)
      ? item.lastSeenPrice
      : (latest.prevClose ?? item.lastSeenPrice ?? latest.price);

    // If item was added or viewed in the last 15 min, look back 24h for previous session's benchmark quotes & news
    const isNewVisit = (Date.now() - item.lastSeenAt.getTime()) < 15 * 60_000;
    const baselineAt = isNewVisit
      ? new Date(Date.now() - 24 * 60 * 60_000)
      : item.lastSeenAt;

    // Compare each benchmark's current price to the last verified price at/before
    // the user's visit. If no historical snapshot exists in DB, fall back to prevClose.
    const [marketNow, marketThen, sectorNow, sectorThen, news] = await Promise.all([
      prisma.quoteSnapshot.findFirst({ where: { symbol: "SPY" }, orderBy: { fetchedAt: "desc" } }),
      prisma.quoteSnapshot.findFirst({ where: { symbol: "SPY", fetchedAt: { lte: baselineAt } }, orderBy: { fetchedAt: "desc" } }),
      prisma.quoteSnapshot.findFirst({ where: { symbol: sectorBenchmark }, orderBy: { fetchedAt: "desc" } }),
      prisma.quoteSnapshot.findFirst({ where: { symbol: sectorBenchmark, fetchedAt: { lte: baselineAt } }, orderBy: { fetchedAt: "desc" } }),
      prisma.newsEvidence.findMany({ where: { symbol: item.symbol, publishedAt: { gt: baselineAt } }, orderBy: { publishedAt: "desc" }, take: 3 }),
    ]);

    const marketPctSinceSeen = (marketNow && marketThen)
      ? pctBetween(marketNow.price, marketThen.price)
      : (marketNow?.prevClose ? pctBetween(marketNow.price, marketNow.prevClose) : null);

    const sectorPctSinceSeen = (sectorNow && sectorThen)
      ? pctBetween(sectorNow.price, sectorThen.price)
      : (sectorNow?.prevClose ? pctBetween(sectorNow.price, sectorNow.prevClose) : null);

    const isStale = latest.isStale || Date.now() - latest.fetchedAt.getTime() > STALE_THRESHOLD_MS;
    const change = computeChange({
      symbol: item.symbol,
      price: latest.price,
      prevClose: latest.prevClose,
      volume: latest.volume,
      fetchedAt: latest.fetchedAt,
      lastSeenPrice: baselinePrice,
      lastSeenAt: baselineAt,
      avgVolume20d: stats?.avgVolume20d ?? null,
      avgDailyRangePct: stats?.avgDailyRangePct ?? null,
      marketPctSinceSeen,
      sectorPctSinceSeen,
      newsCount: news.length,
      isStale,
    });
    const { symbol: _symbol, ...signals } = change;

    const previousSnapshotTs = baselineAt.toISOString();
    const currentDataTs = latest.fetchedAt.toISOString();
    const newBaselineTs = latest.fetchedAt.toISOString();

    console.log(`[BaselineComparison] symbol: ${item.symbol} | previousSnapshot: ${previousSnapshotTs} (price: ${baselinePrice}) | currentData: ${currentDataTs} (price: ${latest.price}) | newBaseline: ${newBaselineTs} (price: ${latest.price})`);

    return {
      symbol: item.symbol,
      notes: item.notes,
      addedAt: item.addedAt,
      price: latest.price,
      previousPrice: latest.prevClose,
      volume: latest.volume,
      avgVolume20d: stats?.avgVolume20d ?? null,
      quoteFetchedAt: latest.fetchedAt,
      marketTimestamp: latest.marketTimestamp,
      lastCheckedAt: item.lastSeenAt,
      previousSnapshotPrice: baselinePrice,
      timestamps: {
        previousSnapshot: previousSnapshotTs,
        currentData: currentDataTs,
        newBaseline: newBaselineTs,
      },
      sectorBenchmark,
      news,
      ...signals,
      dataAvailable: true,
    };
  }));
  results.sort((a, b) => b.meaningfulScore - a.meaningfulScore);
  return NextResponse.json({ items: results, mode: "live" });
}

const addSchema = z.object({ symbol: z.string().min(1).max(15).transform((value) => value.toUpperCase().trim()) });
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  try {
    const latest = await prisma.quoteSnapshot.findFirst({ where: { symbol: parsed.data.symbol }, orderBy: { fetchedAt: "desc" } });
    const baselinePrice = latest?.prevClose ?? latest?.price ?? null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return NextResponse.json({
      item: await prisma.watchlistItem.create({
        data: {
          userId,
          symbol: parsed.data.symbol,
          lastSeenPrice: baselinePrice,
          lastSeenVolume: latest?.volume ?? null,
          lastSeenAt: yesterday,
        },
      }),
    });
  } catch (error: any) {
    if (error.code === "P2002") return NextResponse.json({ error: "Already on your watchlist" }, { status: 409 });
    throw error;
  }
}
