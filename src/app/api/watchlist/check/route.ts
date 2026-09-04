import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

// Called once after the digest is delivered to the user. The previous snapshot is
// used for that digest, then this records price + volume + timestamp for next time.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    select: { id: true, symbol: true, lastSeenAt: true, lastSeenPrice: true },
  });
  await Promise.all(
    items.map(async (item) => {
      const quote = await prisma.quoteSnapshot.findFirst({
        where: { symbol: item.symbol, isStale: false },
        orderBy: { fetchedAt: "desc" },
      });
      if (quote) {
        const previousSnapshotTs = item.lastSeenAt ? item.lastSeenAt.toISOString() : null;
        const newBaselineTs = quote.fetchedAt.toISOString();
        console.log(
          `[BaselinePersist] symbol: ${item.symbol} | previousSnapshot: ${previousSnapshotTs} (price: ${item.lastSeenPrice ?? "none"}) | newBaseline: ${newBaselineTs} (price: ${quote.price})`
        );
        await prisma.watchlistItem.update({
          where: { id: item.id },
          data: {
            lastSeenAt: quote.fetchedAt,
            lastSeenPrice: quote.price,
            lastSeenVolume: quote.volume,
          },
        });
      }
    })
  );
  return NextResponse.json({ ok: true });
}
