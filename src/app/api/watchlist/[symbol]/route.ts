import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await prisma.watchlistItem.deleteMany({
    where: { userId, symbol: params.symbol.toUpperCase() },
  });
  return NextResponse.json({ ok: true });
}

// Called when the user acknowledges a symbol's current change flags — this is what
// resets the "since you last checked" baseline. Deliberately explicit (not just
// "any page load") so a quick glance doesn't erase a signal before the user
// actually registers it.
export async function PATCH(req: NextRequest, { params }: { params: { symbol: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const symbol = params.symbol.toUpperCase();
  const latest = await prisma.quoteSnapshot.findFirst({
    where: { symbol },
    orderBy: { fetchedAt: "desc" },
  });

  await prisma.watchlistItem.updateMany({
    where: { userId, symbol },
    data: {
      lastSeenAt: new Date(),
      lastSeenPrice: latest?.price ?? undefined,
      lastSeenVolume: latest?.volume ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
