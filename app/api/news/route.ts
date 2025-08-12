// app/api/news/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 0;

type FinnhubNews = {
  category?: string;
  datetime: number; // epoch seconds
  headline: string;
  id?: number;
  image?: string;
  related?: string;
  source: string;
  summary?: string;
  url: string;
};

type NewsItem = FinnhubNews & { symbol: string };

const SYM_RE = /^[A-Z0-9.\-]{1,10}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbolsRaw = searchParams.get('symbols') ?? '';
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!symbolsRaw) {
    return NextResponse.json({ error: 'symbols required (comma-separated)' }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'api key missing (set FINNHUB_API_KEY)' }, { status: 500 });
  }

  // ?days=7 (1..30)
  const days = Math.max(1, Math.min(30, Number(searchParams.get('days') ?? 7)));

  const symbols = Array.from(
    new Set(
      symbolsRaw
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s && SYM_RE.test(s))
    )
  ).slice(0, 10);

  if (symbols.length === 0) {
    return NextResponse.json({ items: [], warning: 'no valid symbols' }, { status: 200 });
  }

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const settled = await Promise.allSettled<NewsItem[]>(
      symbols.map(async (sym) => {
        const url =
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}` +
          `&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;

        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 429) return []; // rate limit → vacío para ese símbolo
          throw new Error(`news fetch failed: ${sym} (${res.status})`);
        }

        const json = (await res.json()) as FinnhubNews[];
        return json.map(n => ({ ...n, symbol: sym }));
      })
    );

    const flat: NewsItem[] = settled.flatMap(s => s.status === 'fulfilled' ? s.value : []);

    // Dedup por URL
    const dedup = new Map<string, NewsItem>();
    for (const n of flat) {
      if (!dedup.has(n.url)) dedup.set(n.url, n);
    }

    const items = Array.from(dedup.values())
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 40);

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'news error' }, { status: 500 });
  }
}
