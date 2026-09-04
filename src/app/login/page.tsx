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
    router.replace("/");
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Ledger</h1>
      <p className="text-muted text-[14px] mb-8">
        {mode === "login" ? "Sign in to your watchlist." : "Create an account to get started."}
      </p>

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
        className="text-muted text-[13px] mt-5 hover:text-paper transition-colors"
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
