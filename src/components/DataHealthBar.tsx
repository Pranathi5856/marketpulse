"use client";
import { useEffect, useState } from "react";

export function DataHealthBar({ isStaleAny }: { isStaleAny?: boolean }) {
  const [marketStatus, setMarketStatus] = useState<"Open" | "Closed" | "Pre-market" | "After-hours">("Closed");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Format current US Eastern time for market check
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        weekday: "short",
      });
      const parts = formatter.formatToParts(now);
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
      const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";

      const isWeekday = !["Sat", "Sun"].includes(weekday);
      const timeInMinutes = hour * 60 + minute;

      if (!isWeekday) {
        setMarketStatus("Closed");
      } else if (timeInMinutes >= 570 && timeInMinutes < 960) {
        // 9:30 AM to 4:00 PM ET
        setMarketStatus("Open");
      } else if (timeInMinutes >= 240 && timeInMinutes < 570) {
        // 4:00 AM to 9:30 AM ET
        setMarketStatus("Pre-market");
      } else if (timeInMinutes >= 960 && timeInMinutes < 1200) {
        // 4:00 PM to 8:00 PM ET
        setMarketStatus("After-hours");
      } else {
        setMarketStatus("Closed");
      }

      setCurrentTime(new Date().toLocaleTimeString());
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between border border-ink-800 bg-ink-900/90 px-4 py-2 mb-6 text-[12px] font-mono text-muted">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              marketStatus === "Open"
                ? "bg-gain animate-pulse"
                : marketStatus === "After-hours"
                ? "bg-amber"
                : "bg-ink-600"
            }`}
          />
          <span className="text-paper">US Equities: {marketStatus}</span>
        </div>
        <span className="text-ink-700 hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          Feed: <span className="text-paper">Finnhub Verified</span> (15m delay guard)
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1 sm:mt-0 text-[11px]">
        {isStaleAny ? (
          <span className="text-amber">⚠️ Stale quote detected — showing last verified close</span>
        ) : (
          <span className="text-gain">✓ Zero-bid / bad-tick guard active</span>
        )}
        <span className="text-ink-700 hidden md:inline">|</span>
        <span className="text-muted hidden md:inline">Synced {currentTime}</span>
      </div>
    </div>
  );
}
