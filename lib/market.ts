// lib/market.ts
export type Holding = { symbol: string; name: string; qty: number; buyPrice: number };
export type Snap = { price: number; today: number; max: number; min: number };

export const HOLDINGS: Holding[] = [
  { symbol: "NVDA", name: "NVIDIA", qty: 5, buyPrice: 120 },
  { symbol: "AI", name: "C3.ai", qty: 20, buyPrice: 25 },
  { symbol: "PLTR", name: "Palantir", qty: 30, buyPrice: 14.5 },
  { symbol: "META", name: "Meta", qty: 4, buyPrice: 300 },
  { symbol: "AMD", name: "AMD", qty: 10, buyPrice: 90 },
  { symbol: "SMCI", name: "Super Micro", qty: 3, buyPrice: 650 },
  { symbol: "TSLA", name: "Tesla", qty: 6, buyPrice: 210 },
  { symbol: "PATH", name: "UiPath", qty: 25, buyPrice: 16 },
  { symbol: "AMZN", name: "Amazon", qty: 8, buyPrice: 130 },
  { symbol: "BBAI", name: "BigBear.ai", qty: 60, buyPrice: 3.2 },
  { symbol: "INTC", name: "Intel", qty: 18, buyPrice: 34 },
  { symbol: "ASTS", name: "AST SpaceMobile", qty: 22, buyPrice: 6.5 },
];

const BASES: Record<string, number> = {
  NVDA: 135, AI: 28, PLTR: 16, META: 510, AMD: 160, SMCI: 860,
  TSLA: 250, PATH: 18, AMZN: 180, BBAI: 3.8, INTC: 36, ASTS: 9.5
};

// ---------- RNG determinístico (seeded) ----------
function seedRNG(seed: number) {
  // mulberry32
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Simulación determinística ----------
export function simulate(symbol: string): Snap {
  const base = BASES[symbol] ?? 100;
  const rng = seedRNG(hashStr(symbol));
  // variación diaria en %: aprox entre -3% y +3%
  const todayPct = (rng() - 0.5) * 6; // -3..+3
  const price = +(base * (1 + todayPct / 100)).toFixed(2);
  const amp = Math.abs((rng() - 0.5) * 0.10); // +-5% aprox
  const max = +(price * (1 + amp)).toFixed(2);
  const min = +(price * (1 - amp)).toFixed(2);
  return { price, today: +todayPct.toFixed(2), max, min };
}

// ---------- Formato (mejor usar <Money/> en la UI) ----------
export function currency(n: number) {
  // Fijamos el locale para evitar mismatch SSR/CSR si alguien lo usa
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'USD' });
}

// ---------- Serie histórica determinística ----------
export type SeriesPoint = { time: number; value: number };

/**
 * Genera una serie determinística basada en el precio y un seed opcional.
 * Mantiene firma compatible: makeSeries(price) también funciona.
 */
export function makeSeries(price: number, seedKey: string = 'default'): SeriesPoint[] {
  const seed = hashStr(`${seedKey}|${price.toFixed(2)}`);
  const rng = seedRNG(seed);

  const pts: SeriesPoint[] = [];
  // punto de partida dentro de ±10% del precio
  let p = price * (0.9 + rng() * 0.2);
  const today = new Date();

  for (let i = 120; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    // random walk suave ±1% con leve tendencia
    const drift = (rng() - 0.5) * 0.01;
    p = Math.max(1, p * (1 + drift));
    pts.push({ time: Math.floor(d.getTime() / 1000), value: +p.toFixed(2) });
  }
  return pts;
}
