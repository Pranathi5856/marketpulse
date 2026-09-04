// MarketPulse's score is explainable: each point is tied to an observed signal.
// News provides context only; the app never asserts that a headline caused a move.
export type Evidence = { label: string; detail: string; points: number };

export type ChangeInput = {
  symbol: string; price: number; prevClose: number | null; volume: number | null;
  fetchedAt: Date; lastSeenPrice: number | null; lastSeenAt: Date;
  avgVolume20d: number | null; avgDailyRangePct: number | null;
  marketPctSinceSeen: number | null; sectorPctSinceSeen: number | null;
  newsCount: number; isStale: boolean;
};

export type ChangeResult = {
  symbol: string; pctChangeSinceSeen: number | null; pctChangeToday: number | null;
  volumeRatio: number | null; meaningfulScore: number;
  classification: "normal" | "moderate" | "significant";
  evidence: Evidence[]; isStale: boolean;
};

const clamp = (value: number, maximum: number) => Math.max(0, Math.min(maximum, value));

export function computeChange(input: ChangeInput): ChangeResult {
  const evidence: Evidence[] = [];
  const pctChangeSinceSeen = input.lastSeenPrice && input.lastSeenPrice > 0
    ? ((input.price - input.lastSeenPrice) / input.lastSeenPrice) * 100 : null;
  const pctChangeToday = input.prevClose && input.prevClose > 0
    ? ((input.price - input.prevClose) / input.prevClose) * 100 : null;
  const volatility = Math.max(input.avgDailyRangePct ?? 2, 0.25);

  // Price: 0–35, scaled by each symbol's observed daily range.
  if (pctChangeSinceSeen !== null) {
    const points = clamp((Math.abs(pctChangeSinceSeen) / volatility) * 12, 35);
    if (points > 0) evidence.push({ label: "Price movement", points: Math.round(points), detail:
      `${pctChangeSinceSeen >= 0 ? "+" : ""}${pctChangeSinceSeen.toFixed(1)}% since your last check (typical daily range ${volatility.toFixed(1)}%)` });
  }

  // Divergence catches a symbol acting differently to the broader environment.
  if (pctChangeSinceSeen !== null && input.marketPctSinceSeen !== null) {
    const points = clamp(Math.abs(pctChangeSinceSeen - input.marketPctSinceSeen) * 4, 20);
    evidence.push({ label: "Market divergence", points: Math.round(points), detail:
      `Stock ${pctChangeSinceSeen >= 0 ? "+" : ""}${pctChangeSinceSeen.toFixed(1)}% vs market ${input.marketPctSinceSeen >= 0 ? "+" : ""}${input.marketPctSinceSeen.toFixed(1)}%` });
  }
  if (pctChangeSinceSeen !== null && input.sectorPctSinceSeen !== null) {
    const points = clamp(Math.abs(pctChangeSinceSeen - input.sectorPctSinceSeen) * 3, 15);
    evidence.push({ label: "Sector divergence", points: Math.round(points), detail:
      `Stock ${pctChangeSinceSeen >= 0 ? "+" : ""}${pctChangeSinceSeen.toFixed(1)}% vs sector ${input.sectorPctSinceSeen >= 0 ? "+" : ""}${input.sectorPctSinceSeen.toFixed(1)}%` });
  }

  const volumeRatio = input.volume && input.avgVolume20d && input.avgVolume20d > 0
    ? input.volume / input.avgVolume20d : null;
  if (volumeRatio !== null && volumeRatio >= 1) {
    evidence.push({ label: "Volume anomaly", points: Math.round(clamp((volumeRatio - 1) * 10, 20)), detail:
      `${volumeRatio.toFixed(1)}× its 20-day average volume` });
  }
  if (pctChangeSinceSeen !== null) {
    const points = clamp((Math.abs(pctChangeSinceSeen) / volatility - 1) * 5, 10);
    if (points > 0) evidence.push({ label: "Unusual versus volatility", points: Math.round(points), detail: "Move is larger than this symbol's typical daily range" });
  }
  if (input.newsCount > 0) evidence.push({ label: "Relevant news available", points: 10, detail:
    `${input.newsCount} verified headline${input.newsCount === 1 ? "" : "s"} published since your last check` });

  const meaningfulScore = Math.min(100, evidence.reduce((total, signal) => total + signal.points, 0));
  const classification = meaningfulScore >= 61 ? "significant" : meaningfulScore >= 31 ? "moderate" : "normal";
  return { symbol: input.symbol, pctChangeSinceSeen, pctChangeToday, volumeRatio, meaningfulScore, classification, evidence, isStale: input.isStale };
}
