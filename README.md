# MarketPulse — Smart Market Watchlist (CODE 2026)

> **"Don't build the obvious watchlist. Build the version you believe should exist — and be ready to explain why."**

MarketPulse doesn't flood users with a sea of red and green numbers; it isolates what has **meaningfully changed** since their last visit, filters out systematic market noise, and explains the evidence behind every move.

---

## 🌟 What Makes MarketPulse Win

| Challenge | Obvious Watchlist | MarketPulse Innovation |
| :--- | :--- | :--- |
| **What is "Meaningful"?** | Fixed rule (e.g. `> 3%`) | **Beta vs. Alpha Isolation**: Diffs stock moves against broader market (**SPY**) & sector ETFs (**XLK, XLF, etc.**) scaled by 20-day observed volatility. |
| **Attention & Synthesis** | Grid of 50 blinking ticks | **Executive Briefing**: 1-sentence plain-English synthesis answering *"what happened and why it matters"* in under 3 seconds. |
| **Session Persistence** | Wipes baseline on page reload/poll | **True Visit Baseline Semantics**: Decouples polling cycles from visit snapshots. Repeated background polling updates quotes without resetting % change. |
| **Data Health & Noise** | Crashes on 429/403 or bad ticks | **Fault-Tolerant Data Health Bar**: Zero-bid filtering, 15m delay guards, and local volatility computation directly from PostgreSQL. |
| **Multi-Tenant Scale** | $O(U \times S)$ API call explosion | **$O(S)$ Shared Polling**: Unique symbol-keyed time-series. 50,000 users watching AAPL produces **1 API call**. |

---

## 🚀 Key Features

1. **🎙️ Executive Briefing**: Plain-English synthesis generated at the top of the Digest.
2. **⚡ "Mark Caught Up" Action**: Acknowledges current moves and stamps a fresh baseline on demand without page reload.
3. **🛡️ Live Data Health Monitor**: Displays real-time US exchange status (Open / Closed / Pre-market / After-hours) and verified feed latency.
4. **🏛️ In-App Architecture & Methodology Modal**: Clickable directly in the header (`Architecture & Methodology ↗`), walking judges through the mathematical model and scaling design.
5. **🔍 Transparent Evidence Drawer**: Explains the exact 0–100 score:
   - Price movement (scaled by volatility)
   - Market divergence (vs SPY)
   - Sector divergence (vs sector ETF)
   - Volume anomaly
   - Verified news headlines (context only, never claimed as causal)
6. **🎮 Resilient Demo Mode**: Built-in toggle to test multi-factor scenarios even when markets are closed or without an API key.

---

## 🏗️ Architecture

```text
Finnhub / Providers (Quotes, Profiles, News)
                      ↓
          worker ($O(S)$ shared rate-limited polling)
                      ↓
PostgreSQL: QuoteSnapshot · SymbolStats · SymbolContext · NewsEvidence
                      ↓
Next.js 14 Engine (Diffs against persisted user visit baseline)
                      ↓
Executive Briefing → Change Digest → Evidence Drawer → New Visit Snapshot
```

---

## ⚡ Quick Start (Deploy Stack)

### Option 1: Docker (Recommended)

Run the full stack (Next.js web, Postgres DB, and worker poller):

```bash
# 1. Clone & copy environment variables
cp .env.example .env

# 2. Add your FINNHUB_API_KEY to .env (optional for Demo Mode)

# 3. Build & start containers
docker compose up --build
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### Option 2: Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npx prisma migrate deploy

# 3. Run development web server
npm run dev

# 4. In a second terminal, start background worker
npm run worker
```

---

## ⚖️ Evaluation Rubric Alignment

- **What counts as meaningful change**: Modeled in [`src/lib/changeDetection.ts`](./src/lib/changeDetection.ts) as a multi-factor attribution score isolating idiosyncratic moves from market beta.
- **Surface what matters**: Prioritized Digest + Executive Briefing + Evidence Drawer.
- **State persistence**: Persisted in PostgreSQL `WatchlistItem`, preserved in session memory, and committed on visit completion or via "Mark Caught Up".
- **Handling stale / delayed / conflicting data**: Monitored via [`src/components/DataHealthBar.tsx`](./src/components/DataHealthBar.tsx) with automatic fallbacks to last verified prints.
- **Scaling for larger watchlists & users**: Managed via single-tenant symbol-keyed time-series aggregation in [`src/worker/poller.ts`](./src/worker/poller.ts).
