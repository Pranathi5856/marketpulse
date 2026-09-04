export type Evidence = { label: string; detail: string; points: number };
export type NewsItem = { headline: string; source: string; url: string; publishedAt: string };

export type WatchlistItemView = {
  symbol: string;
  notes: string | null;
  addedAt: string;
  price: number | null;
  previousPrice: number | null;
  volume: number | null;
  avgVolume20d: number | null;
  quoteFetchedAt?: string;
  marketTimestamp?: string;
  lastCheckedAt?: string;
  pctChangeSinceSeen: number | null;
  pctChangeToday: number | null;
  marketPctSinceSeen: number | null;
  sectorPctSinceSeen: number | null;
  sectorBenchmark: string;
  meaningfulScore: number;
  classification: "normal" | "moderate" | "significant";
  evidence: Evidence[];
  news: NewsItem[];
  isStale: boolean;
  dataAvailable: boolean;
  timestamps?: {
    previousSnapshot: string | null;
    currentData: string | null;
    newBaseline: string | null;
  };
  previousSnapshotPrice?: number | null;
};
