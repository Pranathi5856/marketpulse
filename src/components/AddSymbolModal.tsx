"use client";

import { useEffect, useState } from "react";

export function AddSymbolBar({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ symbol: string; description: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="relative mb-8">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search and add US equities — try NVDA, TSLA, AAPL, MSFT…"
          className="w-full bg-ink-900/80 border border-ink-700/80 rounded-lg px-4 py-3 pl-10 text-[14px] font-mono placeholder:font-sans placeholder:text-muted focus:border-amber outline-none transition-colors shadow-sm"
        />
        <span className="absolute left-3.5 top-3.5 text-muted/60 text-sm select-none">🔍</span>
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3.5 top-3 text-muted hover:text-paper text-sm font-mono"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 w-full bg-ink-950/95 border border-ink-700 rounded-lg max-h-72 overflow-auto shadow-2xl backdrop-blur divide-y divide-ink-800/60">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => {
                onAdd(r.symbol);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-ink-800/60 flex items-center justify-between text-[13px] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-bold text-[14px] text-paper group-hover:text-amber transition-colors">
                  {r.symbol}
                </span>
                <span className="text-muted text-[12px] truncate font-sans">
                  {r.description}
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted/60 group-hover:text-amber ml-2 shrink-0">
                + Add
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
