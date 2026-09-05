"use client";

import { WatchlistItemView } from "@/types";
import { getCompanyMeta } from "@/lib/companies";

const formatVolume = (val: number | null) =>
  !val || val <= 0
    ? "N/A — market closed"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);

export function ChangeDetail({
  item,
  onClose,
}: {
  item: WatchlistItemView;
  onClose: () => void;
}) {
  const company = getCompanyMeta(item.symbol);

  // Robust baseline determination:
  // If item.previousSnapshotPrice is distinct from current price, use it.
  // Otherwise fall back to previousPrice (session close) so NVDA or newly added equities show true session delta (e.g. +0.84%)
  const hasDistinctBaseline = Boolean(
    item.previousSnapshotPrice !== null &&
    item.previousSnapshotPrice !== undefined &&
    item.price !== null &&
    Math.abs(item.previousSnapshotPrice - item.price) > 0.001
  );

  const baselinePrice = hasDistinctBaseline
    ? item.previousSnapshotPrice!
    : (item.previousPrice && item.price && Math.abs(item.previousPrice - item.price) > 0.001
        ? item.previousPrice
        : (item.previousSnapshotPrice ?? item.previousPrice ?? item.price));

  const changeSinceBaseline =
    item.pctChangeSinceSeen !== null && Math.abs(item.pctChangeSinceSeen) > 0.001
      ? item.pctChangeSinceSeen
      : (baselinePrice && item.price && Math.abs(baselinePrice - item.price) > 0.001
          ? ((item.price - baselinePrice) / baselinePrice) * 100
          : (item.pctChangeToday ?? 0));

  const isUp = changeSinceBaseline >= 0;
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
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-[13px] font-mono font-bold tabular-nums ${
                isUp
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {isUp ? "+" : ""}{changeSinceBaseline.toFixed(2)}% since visit
            </span>
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
                baselinePrice !== null && baselinePrice !== undefined
                  ? `$${baselinePrice.toFixed(2)}`
                  : "None recorded",
              ],
              ["Previous Close", item.previousPrice === null ? "—" : `$${item.previousPrice.toFixed(2)}`],
              ["Session Volume", formatVolume(item.volume)],
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
                  : "Previous session close",
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
                className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                  item.classification === "significant"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : item.classification === "moderate"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                ● {item.classification}
              </span>
            </div>

            {/* Segmented 0-100 Score Gauge */}
            <div className="mt-3 p-3 bg-ink-900/50 border border-ink-800/80 rounded-lg">
              <div className="flex justify-between items-center text-[10px] font-mono text-muted mb-1.5 uppercase tracking-wider">
                <span className="text-emerald-400">Normal (0–30)</span>
                <span className="text-amber-400">Moderate (31–60)</span>
                <span className="text-rose-400">Significant (61–100)</span>
              </div>
              <div className="relative h-2 w-full bg-ink-950 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500/40 w-[30%] border-r border-ink-900" />
                <div className="h-full bg-amber-500/40 w-[30%] border-r border-ink-900" />
                <div className="h-full bg-rose-500/50 w-[40%]" />
                {/* Indicator Pin */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#ffffff] rounded-full"
                  style={{ left: `${Math.min(99, Math.max(1, item.meaningfulScore))}%` }}
                />
              </div>
            </div>

            <p className="text-muted text-[13px] mt-3">
              {item.classification === "significant"
                ? "This stock experienced idiosyncratic movement divergent from broader market (SPY) and sector benchmarks."
                : item.classification === "moderate"
                ? "Notable activity observed warranting a brief inspection."
                : "Trading within standard volatility noise bands."}
            </p>

            {/* Mini Horizontal Evidence Contribution Bars */}
            <div className="mt-3.5 space-y-2.5">
              {item.evidence.map((signal) => {
                const maxPts = signal.label.includes("Price") ? 35 : signal.label.includes("Volume") ? 25 : 20;
                const barPct = Math.min(100, Math.max(10, (signal.points / maxPts) * 100));
                return (
                  <div
                    key={signal.label}
                    className="border border-ink-800 bg-ink-900/40 p-3 rounded-lg hover:border-ink-700 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-paper text-[13px] font-medium">{signal.label}</span>
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          signal.points >= 25
                            ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                            : signal.points >= 18
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : signal.points >= 12
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                            : "bg-amber-500/15 text-amber-300/90 border border-amber-500/25"
                        }`}
                      >
                        +{signal.points} pts
                      </span>
                    </div>

                    {/* Proportional Contribution Bar - Unified warm palette shading darker with points */}
                    <div className="h-1.5 w-full bg-ink-950 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          signal.points >= 25
                            ? "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400"
                            : signal.points >= 18
                            ? "bg-gradient-to-r from-rose-500 to-rose-400"
                            : signal.points >= 12
                            ? "bg-gradient-to-r from-amber-600 to-amber-500"
                            : "bg-gradient-to-r from-amber-600/80 to-amber-400/80"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>

                    <p className="text-muted text-[12px] leading-relaxed font-sans">{signal.detail}</p>
                  </div>
                );
              })}
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

