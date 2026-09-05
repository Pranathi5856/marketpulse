"use client";

import useSWR from "swr";
import { WatchlistItemView } from "@/types";
import { Sparkline } from "./Sparkline";
import { getCompanyMeta } from "@/lib/companies";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export function WatchlistRow({
  item,
  onRemove,
  onSelect,
}: {
  item: WatchlistItemView;
  onRemove: (symbol: string) => void;
  onSelect: (item: WatchlistItemView) => void;
}) {
  const { data } = useSWR<{ points: { price: number; fetchedAt: string }[] }>(
    `/api/watchlist/${item.symbol}/history`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false, refreshInterval: 60_000 }
  );

  const company = getCompanyMeta(item.symbol);
  const isUp = (item.pctChangeToday ?? 0) >= 0;
  const isVisitUp = (item.pctChangeSinceSeen ?? 0) >= 0;

  return (
    <div
      className={`grid grid-cols-[130px_100px_1fr_115px_115px_32px] items-center gap-3 py-3 px-4 border-b border-ink-800/80 hover:bg-ink-800/35 transition-colors group ${
        item.classification === "significant"
          ? "bg-rose-950/10"
          : item.classification === "moderate"
          ? "bg-amber-950/10"
          : ""
      }`}
    >
      {/* Symbol & Company Name */}
      <div className="text-left min-w-0">
        <button
          onClick={() => onSelect(item)}
          className="font-mono font-bold text-[15px] tracking-tight text-paper hover:text-amber transition-colors block text-left"
        >
          {item.symbol}
        </button>
        <span
          className="text-[11px] text-muted truncate max-w-[125px] block font-sans leading-tight mt-0.5"
          title={company.name}
        >
          {company.name}
        </span>
      </div>

      {/* Intraday Sparkline with Gradient Fill */}
      <div className="flex justify-center">
        <Sparkline
          points={Array.isArray(data?.points) ? data.points.map((point) => point.price) : []}
          positive={isUp}
          width={96}
          height={32}
        />
      </div>

      {/* Meaningful Score & Primary Signal */}
      <button onClick={() => onSelect(item)} className="text-left min-w-0 group-hover:opacity-90">
        {item.dataAvailable ? (
          <div>
            <div className="flex items-center gap-2">
              {item.classification === "significant" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Significant · {item.meaningfulScore}/100
                </span>
              )}
              {item.classification === "moderate" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Moderate · {item.meaningfulScore}/100
                </span>
              )}
              {item.classification === "normal" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Normal · {item.meaningfulScore}/100
                </span>
              )}
            </div>
            <p className="text-muted text-[11px] truncate mt-1 leading-tight font-sans">
              {item.isStale
                ? "Delayed — last verified data"
                : item.evidence[0]?.detail ?? "Within normal volatility bands"}
            </p>
          </div>
        ) : (
          <span className="text-muted text-[12px] italic">Waiting for initial quote…</span>
        )}
      </button>

      {/* Price & Today's Return */}
      <div className="text-right">
        {item.price !== null ? (
          <div>
            <div className="font-mono font-semibold text-[14px] text-paper tabular-nums">
              ${item.price.toFixed(2)}
            </div>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-mono font-medium tabular-nums ${
                  isUp
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {item.pctChangeToday !== null
                  ? `${isUp ? "+" : ""}${item.pctChangeToday.toFixed(2)}%`
                  : "—"}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-muted font-mono">—</span>
        )}
      </div>

      {/* Visit Change (Delta since baseline) */}
      <div className="text-right">
        {item.pctChangeSinceSeen !== null ? (
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-mono font-bold tabular-nums ${
                isVisitUp
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {isVisitUp ? "+" : ""}
              {item.pctChangeSinceSeen.toFixed(2)}%
            </span>
            <span className="text-muted/70 text-[10px] block font-sans mt-0.5 tracking-tight">
              since visit
            </span>
          </div>
        ) : (
          <span className="text-muted font-mono text-[13px]">—</span>
        )}
      </div>

      {/* Remove Action */}
      <div className="text-right">
        <button
          onClick={() => onRemove(item.symbol)}
          title={`Remove ${item.symbol}`}
          className="text-muted/40 hover:text-loss hover:bg-rose-500/10 w-6 h-6 rounded flex items-center justify-center transition-colors text-xs font-mono"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

