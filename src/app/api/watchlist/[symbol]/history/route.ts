import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const snapshots = await prisma.quoteSnapshot.findMany({
    where: { symbol: params.symbol.toUpperCase() },
    orderBy: { fetchedAt: "desc" },
    take: 30,
    select: { price: true, fetchedAt: true },
  });

  return NextResponse.json({ points: snapshots.reverse() });
}
