// Directory of common US equity names for Google Finance-caliber UI presentation
const COMPANY_NAMES: Record<string, { name: string; exchange?: string }> = {
  NVDA: { name: "NVIDIA Corp", exchange: "NASDAQ" },
  TSLA: { name: "Tesla, Inc.", exchange: "NASDAQ" },
  AAPL: { name: "Apple Inc.", exchange: "NASDAQ" },
  MSFT: { name: "Microsoft Corp", exchange: "NASDAQ" },
  AMZN: { name: "Amazon.com, Inc.", exchange: "NASDAQ" },
  GOOGL: { name: "Alphabet Inc.", exchange: "NASDAQ" },
  GOOG: { name: "Alphabet Inc.", exchange: "NASDAQ" },
  META: { name: "Meta Platforms, Inc.", exchange: "NASDAQ" },
  SPY: { name: "SPDR S&P 500 ETF", exchange: "NYSE Arca" },
  QQQ: { name: "Invesco QQQ Trust", exchange: "NASDAQ" },
  XLK: { name: "Technology SPDR", exchange: "NYSE Arca" },
  XLY: { name: "Consumer Discretionary", exchange: "NYSE Arca" },
  NFLX: { name: "Netflix, Inc.", exchange: "NASDAQ" },
  AMD: { name: "Advanced Micro Devices", exchange: "NASDAQ" },
  INTC: { name: "Intel Corporation", exchange: "NASDAQ" },
  CRM: { name: "Salesforce, Inc.", exchange: "NYSE" },
  JPM: { name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  V: { name: "Visa Inc.", exchange: "NYSE" },
  WMT: { name: "Walmart Inc.", exchange: "NYSE" },
  DIS: { name: "Walt Disney Co.", exchange: "NYSE" },
  PLTR: { name: "Palantir Technologies", exchange: "NYSE" },
  UBER: { name: "Uber Technologies", exchange: "NYSE" },
  COIN: { name: "Coinbase Global", exchange: "NASDAQ" },
};

export function getCompanyMeta(symbol: string): { name: string; exchange: string } {
  const sym = symbol.toUpperCase().trim();
  if (COMPANY_NAMES[sym]) {
    return {
      name: COMPANY_NAMES[sym].name,
      exchange: COMPANY_NAMES[sym].exchange ?? "US",
    };
  }
  return {
    name: `${sym} Stock`,
    exchange: "US",
  };
}
