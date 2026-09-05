import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

const DEMO_POINTS: Record<string, number[]> = {
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
    select: { price: true, fetchedAt: true },
  });

  return NextResponse.json({ points: snapshots.reverse() });
}
