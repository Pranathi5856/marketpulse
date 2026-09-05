"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isNeedAuth = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("needAuth") === "true";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    localStorage.setItem("marketpulse-mode", "live");
    window.location.href = "/?mode=live";
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">MarketPulse</h1>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-amber/60 text-amber bg-amber/10">
          CODE 2026
        </span>
      </div>
      <p className="text-muted text-[14px] mb-6">
        {mode === "login" ? "Sign in to manage your live personal watchlist." : "Create an account to start tracking live stocks."}
      </p>

      {isNeedAuth && (
        <div className="mb-6 p-3 bg-amber/10 border border-amber/30 text-amber text-[12px] rounded-sm">
          Please sign in or create an account to use <strong>LIVE MODE</strong> and add custom stocks.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-[12px] text-muted mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ink-900 border border-ink-700 px-3 py-2.5 text-[14px] focus:border-amber outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-ink-900 border border-ink-700 px-3 py-2.5 text-[14px] focus:border-amber outline-none"
          />
        </div>

        {error && <p className="text-loss text-[13px]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-paper text-ink-950 font-medium py-2.5 text-[14px] hover:bg-white transition-colors disabled:opacity-50"
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-muted text-[13px] mt-5 block hover:text-paper transition-colors"
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-800"></div></div>
        <span className="relative bg-ink-950 px-3 text-[11px] text-muted tracking-wider uppercase font-mono">evaluator quick access</span>
      </div>

      <button
        type="button"
        onClick={() => {
          localStorage.setItem("marketpulse-mode", "demo");
          window.location.href = "/?mode=demo";
        }}
        className="w-full border border-amber/40 bg-amber/5 text-amber py-2.5 text-[13px] font-medium hover:bg-amber/10 transition-colors flex items-center justify-center gap-2 rounded-sm"
      >
        <span>⚡</span>
        <span>Explore Demo Mode (No sign up required)</span>
      </button>
    </main>
  );
}
