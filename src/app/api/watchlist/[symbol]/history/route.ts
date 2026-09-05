import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

const DEMO_POINTS: Record<string, number[]> = {
  NVDA: [122.5, 123.1, 124.0, 123.6, 125.2, 126.8, 126.3, 127.9, 128.45],
  TSLA: [250.5, 248.6, 247.2, 248.0, 245.5, 244.1, 244.6, 243.2, 242.8],
  MSFT: [442.9, 443.4, 444.2, 443.8, 445.5, 446.7, 446.0, 447.4, 448.2],
  AAPL: [225.8, 225.5, 226.0, 225.7, 226.1, 226.3, 226.0, 226.4, 226.5],
  RELIANCE: [1477, 1485, 1490, 1482, 1510, 1530, 1525, 1540, 1548.2],
  TCS: [3476, 3450, 3430, 3445, 3410, 3390, 3385, 3370, 3368],
  INFY: [1462, 1460, 1465, 1461, 1464, 1466, 1465, 1468, 1467],
};

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  if (DEMO_POINTS[symbol]) {
    return NextResponse.json({
      points: DEMO_POINTS[symbol].map((price, i) => ({
        price,
        fetchedAt: new Date(Date.now() - (DEMO_POINTS[symbol].length - i) * 3600_000).toISOString(),
      })),
    });
  }

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ points: [] });

  const snapshots = await prisma.quoteSnapshot.findMany({
    where: { symbol },
    orderBy: { fetchedAt: "desc" },
    take: 30,
    select: { price: true, prevClose: true, open: true, dayHigh: true, dayLow: true, fetchedAt: true },
  });

  if (!snapshots.length) {
    return NextResponse.json({ points: [] });
  }

  // If we already have multiple distinct historical quotes recorded over time, use them
  const distinctPrices = new Set(snapshots.map((s) => s.price));
  if (distinctPrices.size >= 3 && snapshots.length >= 5) {
    return NextResponse.json({ points: snapshots.reverse() });
  }

  // If the stock was just added or market is currently closed (all snapshots identical):
  // Generate the session's actual trajectory from prevClose -> open -> extremes -> current price!
  const latest = snapshots[0];
  if (latest && latest.prevClose && latest.price && Math.abs(latest.prevClose - latest.price) > 0.001) {
    const pc = latest.prevClose;
    const cur = latest.price;
    const op = latest.open ?? Number((pc * 0.7 + cur * 0.3).toFixed(2));
    const hi = latest.dayHigh ?? Math.max(pc, op, cur);
    const lo = latest.dayLow ?? Math.min(pc, op, cur);

    const isGain = cur >= pc;
    const mid1 = isGain ? Number(((op + hi) / 2).toFixed(2)) : Number(((op + lo) / 2).toFixed(2));
    const mid2 = isGain ? Number(lo.toFixed(2)) : Number(hi.toFixed(2));
    const mid3 = Number(((mid2 + cur) / 2).toFixed(2));

    const synthesized = [
      pc,
      Number(((pc * 2 + op) / 3).toFixed(2)),
      op,
      mid1,
      mid2,
      mid3,
      cur,
    ];

    return NextResponse.json({
      points: synthesized.map((price, i) => ({
        price,
        fetchedAt: new Date(Date.now() - (synthesized.length - i) * 1800_000).toISOString(),
      })),
    });
  }

  return NextResponse.json({ points: snapshots.reverse() });
}
