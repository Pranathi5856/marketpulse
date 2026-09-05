"use client";

import { WatchlistItemView } from "@/types";
import { getCompanyMeta } from "@/lib/companies";

const number = (value: number | null) =>
  value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export function ChangeDetail({
  item,
  onClose,
}: {
  item: WatchlistItemView;
  onClose: () => void;
}) {
  const company = getCompanyMeta(item.symbol);
  const isUp = (item.pctChangeSinceSeen ?? 0) >= 0;
  const isTodayUp = (item.pctChangeToday ?? 0) >= 0;

  return (
    <div
      className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto flex justify-end"
      onClick={onClose}
    >
      <aside
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl border border-ink-800 bg-ink-950/95 rounded-lg p-6 sm:p-8 shadow-2xl flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-ink-800 text-muted border border-ink-700">
                  {company.exchange}
                </span>
                <span className="text-muted text-[11px] uppercase tracking-[0.16em] font-mono">
                  Asset Intelligence
                </span>
              </div>
              <h2 className="font-mono text-2xl font-bold mt-1.5 flex items-center gap-2 text-paper">
                <span>{item.symbol}</span>
                <span className="text-muted text-base font-normal font-sans">
                  {company.name}
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-paper text-sm font-mono border border-ink-800 hover:border-ink-700 px-2.5 py-1 rounded transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Large Price & Return Badge Header */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-paper tabular-nums">
              {item.price !== null ? `$${item.price.toFixed(2)}` : "—"}
            </span>
            {item.pctChangeSinceSeen !== null && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded text-[13px] font-mono font-bold tabular-nums ${
                  isUp
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}
              >
                {isUp ? "+" : ""}{item.pctChangeSinceSeen.toFixed(2)}% since visit
              </span>
            )}
            {item.pctChangeToday !== null && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-mono font-medium tabular-nums ${
                  isTodayUp ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                }`}
              >
                {isTodayUp ? "+" : ""}{item.pctChangeToday.toFixed(2)}% today
              </span>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-ink-800 mt-6 rounded-md overflow-hidden border border-ink-800">
            {[
              ["Current Price", item.price === null ? "—" : `$${item.price.toFixed(2)}`],
              [
                "Visit Baseline",
                item.previousSnapshotPrice !== null && item.previousSnapshotPrice !== undefined
                  ? `$${item.previousSnapshotPrice.toFixed(2)}`
                  : "None recorded",
              ],
              ["Previous Close", item.previousPrice === null ? "—" : `$${item.previousPrice.toFixed(2)}`],
              ["Session Volume", number(item.volume)],
              [
                "Data Freshness",
                item.isStale
                  ? "Delayed"
                  : item.quoteFetchedAt
                  ? new Date(item.quoteFetchedAt).toLocaleTimeString()
                  : "Unavailable",
              ],
              [
                "Baseline Visit",
                item.timestamps?.previousSnapshot
                  ? new Date(item.timestamps.previousSnapshot).toLocaleDateString() +
                    " " +
                    new Date(item.timestamps.previousSnapshot).toLocaleTimeString()
                  : "Initial visit",
              ],
            ].map(([label, value]) => (
              <div key={label} className="bg-ink-900/90 p-3">
                <p className="text-muted text-[11px] font-sans">{label}</p>
                <p className="font-mono text-[13px] font-medium text-paper mt-1 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {/* Meaningful Score & Signals */}
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <h3 className="text-paper font-semibold text-[15px]">
                Why this score:{" "}
                <span className="font-mono text-amber font-bold">{item.meaningfulScore}/100</span>
              </h3>
              <span
                className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded ${
                  item.classification === "significant"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : item.classification === "moderate"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {item.classification}
              </span>
            </div>
            <p className="text-muted text-[13px] mt-1.5">
              {item.classification === "significant"
                ? "This stock experienced idiosyncratic movement divergent from the broader market and sector."
                : item.classification === "moderate"
                ? "Notable activity observed warranting a brief inspection."
                : "Trading within standard volatility tolerances."}
            </p>
            <div className="mt-3.5 space-y-2">
              {item.evidence.map((signal) => (
                <div
                  key={signal.label}
                  className="border border-ink-800 bg-ink-900/40 p-3 rounded-md flex gap-3 items-start"
                >
                  <span className="text-amber font-mono font-bold text-[13px] shrink-0">
                    +{signal.points}
                  </span>
                  <div>
                    <p className="text-paper text-[13px] font-medium">{signal.label}</p>
                    <p className="text-muted text-[12px] mt-0.5 leading-normal">{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* News Context */}
          <section className="mt-7">
            <h3 className="text-paper font-semibold text-[15px]">Evidence: Verified News</h3>
            <p className="text-muted text-[12px] mt-1">
              Contextual headlines detected in the observation interval. MarketPulse does not assert direct causality.
            </p>
            {item.news.length ? (
              <div className="mt-3 space-y-2">
                {item.news.map((news) => (
                  <a
                    key={news.url}
                    href={news.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-ink-800 bg-ink-900/40 p-3 rounded-md hover:bg-ink-800/60 hover:border-ink-700 transition-colors"
                  >
                    <p className="text-paper text-[13px] font-medium leading-snug">{news.headline}</p>
                    <p className="text-muted text-[11px] mt-1 font-mono">
                      {news.source} · {new Date(news.publishedAt).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted text-[13px] mt-3 italic">
                No verified news during this interval. Score is derived strictly from quantitative price, volume, and benchmark divergence.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

