import { WatchlistItemView } from "@/types";

export function ChangeDigest({
  items,
  onSelect,
  onAcknowledge,
  isAcknowledged,
}: {
  items: WatchlistItemView[];
  onSelect: (item: WatchlistItemView) => void;
  onAcknowledge?: () => void;
  isAcknowledged?: boolean;
}) {
  const significant = items.filter((item) => item.classification === "significant");
  const moderate = items.filter((item) => item.classification === "moderate");
  const meaningful = [...significant, ...moderate];
  if (!items.length) return null;

  // Synthesize executive briefing narrative
  let executiveBriefing = "";
  if (isAcknowledged) {
    executiveBriefing = "All market movements have been acknowledged. Your baseline is now synced to current prices.";
  } else if (meaningful.length > 0) {
    const top = meaningful[0];
    const topPct = top.pctChangeSinceSeen !== null ? Math.abs(top.pctChangeSinceSeen).toFixed(1) : "0.0";
    const dir = (top.pctChangeSinceSeen ?? 0) >= 0 ? "gained" : "dropped";
    const detailSnippet = top.evidence[0]?.detail ? ` (${top.evidence[0].detail.split("(")[0].trim()})` : "";
    executiveBriefing = `Since your previous visit, ${meaningful.length} of your ${items.length} stocks had idiosyncratic movements. Most noticeably, ${top.symbol} ${dir} ${topPct}% (Score ${top.meaningfulScore}/100)${detailSnippet}.`;
  } else {
    executiveBriefing = `All ${items.length} stocks are behaving within normal volatility bands. No anomalous divergence or volume spikes detected since your last visit.`;
  }

  return (
    <section className="border border-ink-700 bg-ink-900 px-5 py-5 mb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted text-[11px] uppercase tracking-[0.16em]">Since your last visit</p>
        {onAcknowledge && (
          isAcknowledged ? (
            <span className="text-gain text-[11px] font-mono">✓ Baseline synced to current quotes</span>
          ) : (
            <button
              onClick={onAcknowledge}
              className="text-[11px] font-mono border border-ink-700 px-2.5 py-1 text-muted hover:text-paper hover:border-amber transition-colors"
              title="Acknowledge all changes and stamp a fresh baseline now"
            >
              ✓ Mark Caught Up
            </button>
          )
        )}
      </div>

      <div className="flex items-end justify-between gap-4 mb-4">
        <p className="text-paper text-xl font-semibold">{items.length} stocks monitored</p>
        <p className="text-muted text-[12px] font-mono hidden sm:block">
          Baseline preserved from previous visit
        </p>
      </div>

      {/* Executive Briefing Card */}
      <div className="border border-ink-800 bg-ink-950/80 p-3.5 mb-4 rounded-none">
        <p className="text-[10px] font-mono text-amber uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <span>🎙️</span> Executive Briefing
        </p>
        <p className="text-[13px] text-paper leading-relaxed">{executiveBriefing}</p>
      </div>

      {meaningful.length && !isAcknowledged ? (
        <>
          <p className="text-[14px] text-paper mb-3">
            <span className="text-loss">●</span> {significant.length} significant ·{" "}
            <span className="text-amber">●</span> {moderate.length} moderate changes
          </p>
          <div className="space-y-2">
            {meaningful.slice(0, 5).map((item) => (
              <button
                key={item.symbol}
                onClick={() => onSelect(item)}
                className="w-full grid grid-cols-[1fr_90px_80px] text-left items-center border border-ink-700 px-3 py-2 hover:bg-ink-800 transition-colors"
              >
                <span className="font-mono font-semibold">{item.symbol}</span>
                <span
                  className={
                    item.pctChangeSinceSeen && item.pctChangeSinceSeen >= 0
                      ? "text-gain font-mono"
                      : "text-loss font-mono"
                  }
                >
                  {item.pctChangeSinceSeen !== null
                    ? `${item.pctChangeSinceSeen >= 0 ? "+" : ""}${item.pctChangeSinceSeen.toFixed(1)}%`
                    : "—"}
                </span>
                <span className="text-right font-mono text-paper">Score {item.meaningfulScore}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-paper text-[14px]">🟢 No unacknowledged meaningful changes.</p>
      )}
      <p className="text-muted text-[12px] mt-4">
        🟢 {isAcknowledged ? items.length : Math.max(0, items.length - meaningful.length)} stocks within normal parameters
      </p>
    </section>
  );
}
