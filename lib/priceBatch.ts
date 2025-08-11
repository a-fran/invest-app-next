export type LiveRow = { symbol: string; price: number; today: number; max: number; min: number; error?: string };
export async function fetchLivePrices(symbols: string[]): Promise<Record<string, LiveRow>> {
  const qs = encodeURIComponent(symbols.join(","));
  const r = await fetch(`/api/prices/batch?symbols=${qs}`, { cache: "no-store" });
  if (!r.ok) return {};
  return r.json();
}
