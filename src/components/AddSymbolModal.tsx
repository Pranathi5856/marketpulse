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
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Add a symbol — try AAPL, TSLA, NVDA…"
        className="w-full bg-ink-900 border border-ink-700 px-4 py-3 text-[14px] font-mono placeholder:font-sans placeholder:text-muted focus:border-amber outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-ink-900 border border-ink-700 max-h-72 overflow-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => {
                onAdd(r.symbol);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-ink-800 flex items-center justify-between text-[13px]"
            >
              <span className="font-mono font-medium">{r.symbol}</span>
              <span className="text-muted truncate ml-4">{r.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
