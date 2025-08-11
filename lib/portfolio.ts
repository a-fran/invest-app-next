// lib/portfolio.ts
export type PortfolioRow = { symbol: string; qty: number; buyPrice: number; name?: string };

const KEY = 'portfolio.v1';

export function loadPortfolio(defaultRows: PortfolioRow[] = []): PortfolioRow[] {
  if (typeof window === 'undefined') return defaultRows;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultRows;
    const rows = JSON.parse(raw) as PortfolioRow[];
    return sanitize(rows);
  } catch {
    return defaultRows;
  }
}

export function savePortfolio(rows: PortfolioRow[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(sanitize(rows)));
}

function sanitize(rows: PortfolioRow[]): PortfolioRow[] {
  const seen = new Set<string>();
  return rows
    .map(r => ({
      symbol: (r.symbol || '').trim().toUpperCase(),
      qty: Number(r.qty || 0),
      buyPrice: Number(r.buyPrice || 0),
      name: r.name?.trim() || undefined,
    }))
    .filter(r => r.symbol && !seen.has(r.symbol) && (seen.add(r.symbol), true));
}
