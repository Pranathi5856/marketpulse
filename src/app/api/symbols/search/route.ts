import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { searchSymbol } from "@/lib/finnhub";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  try {
    const data = await searchSymbol(q);
    const results = data.result
      .filter((r) => r.type === "Common Stock" || r.type === "ETP")
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol, description: r.description }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Symbol lookup unavailable" });
  }
}
