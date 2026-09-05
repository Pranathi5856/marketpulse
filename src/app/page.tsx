"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { WatchlistItemView } from "@/types";
import { ChangeDigest } from "@/components/ChangeDigest";
import { WatchlistRow } from "@/components/WatchlistRow";
import { ChangeDetail } from "@/components/ChangeDetail";
import { AddSymbolBar } from "@/components/AddSymbolModal";
import { DataHealthBar } from "@/components/DataHealthBar";
import { MethodologyModal } from "@/components/MethodologyModal";

const fetcher = (url: string) => fetch(url).then(async (response) => { if (!response.ok) { const error: any = new Error("Request failed"); error.status = response.status; throw error; } return response.json(); });
type DashboardData = { items: WatchlistItemView[]; mode: "live" | "demo"; authenticated?: boolean };

export default function Dashboard() {
  const router = useRouter();
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [selected, setSelected] = useState<WatchlistItemView | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isCaughtUp, setIsCaughtUp] = useState(false);
  const visitBaselines = useRef<Map<string, { price: number | null; timestamp: string | null }>>(new Map());
  const initialComparisonDone = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "live") {
        setMode("live");
      }
    }
  }, []);

  const { data, error, mutate, isLoading } = useSWR<DashboardData>(
    `/api/watchlist?mode=${mode}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: mode === "live" ? 30_000 : 0 }
  );

  useEffect(() => {
    if (!data?.items || !Array.isArray(data.items)) return;
    if (data.mode === "live") {
      data.items.forEach((item) => {
        if (item.dataAvailable && !visitBaselines.current.has(item.symbol)) {
          visitBaselines.current.set(item.symbol, {
            price: item.previousSnapshotPrice ?? item.price,
            timestamp: item.timestamps?.previousSnapshot ?? item.lastCheckedAt ?? null,
          });
        }
        if (item.dataAvailable) {
          console.log(
            `[BaselineComparison] symbol: ${item.symbol} | previousSnapshot: ${item.timestamps?.previousSnapshot ?? "none"} (price: ${item.previousSnapshotPrice ?? "none"}) | currentData: ${item.timestamps?.currentData ?? "none"} (price: ${item.price}) | newBaseline: ${item.timestamps?.newBaseline ?? "none"}`
          );
        }
      });
      initialComparisonDone.current = true;
    }
  }, [data]);

  useEffect(() => {
    const persistBaseline = () => {
      if (mode !== "live" || !initialComparisonDone.current) return;
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/watchlist/check");
        } else {
          fetch("/api/watchlist/check", { method: "POST", keepalive: true }).catch(() => {});
        }
      } catch {
        // Ignore beacon/fetch errors on unload
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistBaseline();
      }
    };

    window.addEventListener("pagehide", persistBaseline);
    window.addEventListener("beforeunload", persistBaseline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", persistBaseline);
      window.removeEventListener("beforeunload", persistBaseline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mode]);

  const switchMode = (next: "live" | "demo") => {
    if (next === "live" && !data?.authenticated) {
      router.push("/login?needAuth=true");
      return;
    }
    visitBaselines.current.clear();
    initialComparisonDone.current = false;
    setIsCaughtUp(false);
    setSelected(null);
    setMode(next);
  };

  async function addSymbol(symbol: string) {
    if (mode === "demo") {
      alert("Sign in or create an account to customize your live watchlist!");
      return;
    }
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    if (response.ok) {
      setIsCaughtUp(false);
      mutate();
    }
  }

  async function removeSymbol(symbol: string) {
    await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
    visitBaselines.current.delete(symbol);
    mutate();
  }

  async function markCaughtUp() {
    if (mode !== "live") return;
    try {
      await fetch("/api/watchlist/check", { method: "POST" });
      data?.items.forEach((item) => {
        if (item.price !== null) {
          visitBaselines.current.set(item.symbol, {
            price: item.price,
            timestamp: new Date().toISOString(),
          });
        }
      });
      setIsCaughtUp(true);
      mutate();
    } catch (err) {
      console.error("Mark caught up failed:", err);
    }
  }

  async function logout() {
    if (mode === "live" && initialComparisonDone.current) {
      try {
        await fetch("/api/watchlist/check", { method: "POST" });
      } catch {}
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const rawActive = Array.isArray(data?.items) ? data.items : [];
  const active = rawActive.map((item) => {
    if (isCaughtUp) {
      return {
        ...item,
        pctChangeSinceSeen: 0,
        classification: "normal" as const,
        meaningfulScore: 0,
        evidence: [],
      };
    }
    const baseline = visitBaselines.current.get(item.symbol);
    if (!baseline || baseline.price === null || baseline.price === 0 || item.price === null) {
      return item;
    }
    if (item.previousSnapshotPrice === baseline.price) {
      return item;
    }
    const pctChangeSinceSeen = ((item.price - baseline.price) / baseline.price) * 100;
    return {
      ...item,
      pctChangeSinceSeen,
      previousSnapshotPrice: baseline.price,
      timestamps: {
        ...item.timestamps,
        previousSnapshot: baseline.timestamp,
        currentData: item.timestamps?.currentData ?? item.quoteFetchedAt ?? null,
        newBaseline: item.timestamps?.newBaseline ?? item.quoteFetchedAt ?? null,
      },
    };
  });

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">MarketPulse</h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-amber/60 text-amber bg-amber/10">
              CODE 2026
            </span>
          </div>
          <p className="text-muted text-[14px] mt-1">
            What changed meaningfully since you last looked — and the evidence behind it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMethodology(true)}
            className="text-amber text-[12px] font-mono border border-amber/50 px-3 py-1.5 hover:bg-amber hover:text-ink-950 transition-colors"
          >
            Methodology & Architecture ↗
          </button>
          {data?.authenticated ? (
            <button onClick={logout} className="text-muted text-[13px] hover:text-paper">
              Sign out
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-amber text-[13px] hover:underline"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-[12px] font-mono">
        <div className="flex gap-1 border border-ink-700 p-1">
          <button
            onClick={() => switchMode("live")}
            className={`px-3 py-1.5 ${mode === "live" ? "bg-ink-700 text-paper" : "text-muted"}`}
          >
            LIVE MODE
          </button>
          <button
            onClick={() => switchMode("demo")}
            className={`px-3 py-1.5 ${mode === "demo" ? "bg-amber text-ink-900" : "text-muted"}`}
          >
            DEMO MODE
          </button>
        </div>
        {mode === "live" && (
          <button onClick={() => mutate()} className="border border-ink-700 px-3 py-1.5 text-muted hover:text-paper">
            REFRESH DATA
          </button>
        )}
      </div>

      {/* Data Health & Integrity Monitor */}
      <DataHealthBar isStaleAny={active.some((i) => i.isStale)} />

      {mode === "demo" && (
        <p className="border border-amber/50 text-amber text-[13px] px-3 py-2 mb-5">
          Controlled presentation scenario — showcasing multi-factor change detection and explainable evidence scoring.
        </p>
      )}

      {mode === "live" && error?.status === 401 && (
        <div className="border border-amber/40 bg-amber/5 p-6 mb-8 text-center rounded-sm">
          <p className="text-paper text-[15px] font-semibold mb-1">Sign-in Required for Live Mode</p>
          <p className="text-muted text-[13px] mb-4">You are currently browsing as a guest. Sign in to track live stocks in your personal portfolio.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push("/login")} className="bg-amber text-ink-950 font-medium px-4 py-2 text-[13px] rounded-sm hover:bg-white transition-colors">Sign in / Create Account</button>
            <button onClick={() => switchMode("demo")} className="border border-ink-700 px-4 py-2 text-[13px] text-muted hover:text-paper transition-colors">Switch to Demo Mode</button>
          </div>
        </div>
      )}

      {mode === "live" && !error && <AddSymbolBar onAdd={addSymbol} />}
      {isLoading && <p className="text-muted text-[14px]">Checking your watchlist…</p>}

      {data && (
        <>
          <ChangeDigest
            items={active}
            onSelect={setSelected}
            onAcknowledge={mode === "live" ? markCaughtUp : undefined}
            isAcknowledged={isCaughtUp}
          />
          {active.length === 0 ? (
            <div className="border border-ink-700 bg-ink-900 px-5 py-10 text-center">
              <p className="text-paper text-[15px]">Your watchlist is empty.</p>
              <p className="text-muted text-[13px] mt-1">Add a symbol above to start tracking it.</p>
            </div>
          ) : (
            <div className="border border-ink-700">
              <div className="grid grid-cols-[80px_90px_1fr_100px_100px_auto] gap-4 py-2.5 px-4 border-b border-ink-700 text-[11px] text-muted uppercase tracking-wide">
                <div>Symbol</div>
                <div>Trend</div>
                <div>Meaning</div>
                <div className="text-right">Price</div>
                <div className="text-right">Since visit</div>
                <div />
              </div>
              {active.map((item) => (
                <WatchlistRow key={item.symbol} item={item} onRemove={removeSymbol} onSelect={setSelected} />
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <ChangeDetail
          item={active.find((item) => item.symbol === selected.symbol) ?? selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showMethodology && <MethodologyModal onClose={() => setShowMethodology(false)} />}
    </main>
  );
}
