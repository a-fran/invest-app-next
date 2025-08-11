export type LiveSnap = { symbol: string; price: number; today: number; max: number; min: number; source?: string };

export async function fetchLivePrice(symbol: string): Promise<LiveSnap | null> {
  try {
    const r = await fetch(`/api/prices?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const data = await r.json();
    if ((data as any)?.error) return null;
    return data as LiveSnap;
  } catch {
    return null;
  }
}
