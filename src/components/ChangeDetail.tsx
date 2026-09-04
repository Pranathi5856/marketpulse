"use client";
import { WatchlistItemView } from "@/types";

const number = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
export function ChangeDetail({ item, onClose }: { item: WatchlistItemView; onClose: () => void }) {
  return <div className="fixed inset-0 z-20 bg-black/60 p-4 sm:p-8 overflow-y-auto" onClick={onClose}><aside onClick={(event) => event.stopPropagation()} className="ml-auto w-full max-w-xl border border-ink-700 bg-ink-900 p-6 min-h-full">
    <div className="flex justify-between items-start"><div><p className="text-muted text-[11px] uppercase tracking-[0.16em]">What changed</p><h2 className="font-mono text-2xl font-semibold mt-1">{item.symbol} <span className={item.pctChangeSinceSeen && item.pctChangeSinceSeen >= 0 ? "text-gain" : "text-loss"}>{item.pctChangeSinceSeen !== null ? `${item.pctChangeSinceSeen >= 0 ? "+" : ""}${item.pctChangeSinceSeen.toFixed(1)}%` : "—"}</span></h2></div><button onClick={onClose} className="text-muted hover:text-paper">Close</button></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-ink-700 mt-6 border border-ink-700">{[
      ["Current price", item.price === null ? "—" : `$${item.price.toFixed(2)}`],
      ["Visit baseline", item.previousSnapshotPrice !== null && item.previousSnapshotPrice !== undefined ? `$${item.previousSnapshotPrice.toFixed(2)}` : "None"],
      ["Previous close", item.previousPrice === null ? "—" : `$${item.previousPrice.toFixed(2)}`],
      ["Session volume", number(item.volume)],
      ["Freshness", item.isStale ? "Delayed" : item.quoteFetchedAt ? new Date(item.quoteFetchedAt).toLocaleTimeString() : "Unavailable"],
      ["Baseline visit", item.timestamps?.previousSnapshot ? new Date(item.timestamps.previousSnapshot).toLocaleDateString() + " " + new Date(item.timestamps.previousSnapshot).toLocaleTimeString() : "Initial visit"]
    ].map(([label, value]) => <div key={label} className="bg-ink-900 p-3"><p className="text-muted text-[11px]">{label}</p><p className="font-mono text-[14px] mt-1">{value}</p></div>)}</div>
    <section className="mt-7"><h3 className="text-paper font-semibold">Why this score: {item.meaningfulScore}/100</h3><p className="text-muted text-[13px] mt-1">{item.classification === "significant" ? "This movement is significant relative to market conditions." : item.classification === "moderate" ? "This merits a quick look." : "No meaningful change detected."}</p><div className="mt-3 space-y-2">{item.evidence.map((signal) => <div key={signal.label} className="border border-ink-700 p-3 flex gap-3"><span className="text-amber font-mono">+{signal.points}</span><div><p className="text-paper text-[14px]">{signal.label}</p><p className="text-muted text-[13px]">{signal.detail}</p></div></div>)}</div></section>
    <section className="mt-7"><h3 className="text-paper font-semibold">Evidence: verified news</h3><p className="text-muted text-[12px] mt-1">Headlines add context; MarketPulse does not claim they caused the price movement.</p>{item.news.length ? <div className="mt-3 space-y-2">{item.news.map((news) => <a key={news.url} href={news.url} target="_blank" rel="noreferrer" className="block border border-ink-700 p-3 hover:bg-ink-800"><p className="text-paper text-[14px]">{news.headline}</p><p className="text-muted text-[12px] mt-1">{news.source} · {new Date(news.publishedAt).toLocaleString()}</p></a>)}</div> : <p className="text-muted text-[13px] mt-3">No verified news was available. Score uses market signals only.</p>}</section>
  </aside></div>;
}
