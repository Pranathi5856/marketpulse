ALTER TABLE "QuoteSnapshot" ADD COLUMN "marketTimestamp" TIMESTAMP(3);

CREATE TABLE "SymbolContext" (
    "symbol" TEXT NOT NULL,
    "industry" TEXT,
    "sectorBenchmark" TEXT DEFAULT 'SPY',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SymbolContext_pkey" PRIMARY KEY ("symbol")
);

CREATE TABLE "NewsEvidence" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsEvidence_symbol_url_key" ON "NewsEvidence"("symbol", "url");
CREATE INDEX "NewsEvidence_symbol_publishedAt_idx" ON "NewsEvidence"("symbol", "publishedAt");
