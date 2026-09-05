"use client";
import useSWR from "swr";
import { WatchlistItemView } from "@/types";
import { Sparkline } from "./Sparkline";

const fetcher = (url: string) => fetch(url).then((response) => response.json());
const scoreStyle = { significant: "text-loss", moderate: "text-amber", normal: "text-gain" };

export function WatchlistRow({ item, onRemove, onSelect }: { item: WatchlistItemView; onRemove: (symbol: string) => void; onSelect: (item: WatchlistItemView) => void }) {
  const { data } = useSWR<{ points: { price: number; fetchedAt: string }[] }>(
    `/api/watchlist/${item.symbol}/history`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false, refreshInterval: 60_000 }
  );
  const isUp = (item.pctChangeToday ?? 0) >= 0;
  return <div className={`grid grid-cols-[80px_90px_1fr_100px_100px_auto] items-center gap-4 py-3 px-4 border-b border-ink-800 ${item.classification !== "normal" ? "bg-ink-900/60" : ""}`}>
    <button onClick={() => onSelect(item)} className="font-mono font-semibold text-[15px] text-left hover:text-amber">{item.symbol}</button>
    <Sparkline points={Array.isArray(data?.points) ? data.points.map((point) => point.price) : []} positive={isUp} />
    <button onClick={() => onSelect(item)} className="text-left text-[13px] hover:text-paper">
      {item.dataAvailable ? <><span className={scoreStyle[item.classification]}>● {item.classification} · {item.meaningfulScore}/100</span><span className="text-muted block text-[11px] mt-1">{item.isStale ? "Delayed — last verified data" : item.evidence[0]?.detail ?? "No notable change"}</span></> : <span className="text-muted">Waiting for first quote…</span>}
    </button>
    <div className="font-mono text-right text-[14px]">{item.price !== null ? <><div>${item.price.toFixed(2)}</div><div className={isUp ? "text-gain" : "text-loss"}>{item.pctChangeToday !== null ? `${isUp ? "+" : ""}${item.pctChangeToday.toFixed(2)}%` : "—"}</div></> : <span className="text-muted">—</span>}</div>
    <div className="font-mono text-right text-[14px]">{item.pctChangeSinceSeen !== null ? <span className={item.pctChangeSinceSeen >= 0 ? "text-gain" : "text-loss"}>{item.pctChangeSinceSeen >= 0 ? "+" : ""}{item.pctChangeSinceSeen.toFixed(2)}%<span className="text-muted text-[11px] font-sans block">since last visit</span></span> : <span className="text-muted">—</span>}</div>
    <button onClick={() => onRemove(item.symbol)} className="text-muted hover:text-loss text-[13px]">Remove</button>
  </div>;
}
