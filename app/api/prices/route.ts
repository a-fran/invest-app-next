import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const symbolsParam = searchParams.get('symbols');
  const token = process.env.FINNHUB_API_KEY;

  if (!token) {
    return NextResponse.json({ error: 'Missing FINNHUB_API_KEY' }, { status: 503 });
  }

  // Consulta de 1 símbolo
  if (symbol && !symbolsParam) {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`,
        { cache: 'no-store' }
      );
      const j = await r.json();
      if (!r.ok || j?.error) {
        return NextResponse.json({ error: j?.error || `HTTP ${r.status}` }, { status: 502 });
      }
      if (j.c == null) {
        return NextResponse.json({ error: 'No data' }, { status: 404 });
      }
      return NextResponse.json({
        symbol,
        price: j.c,
        today: j.c && j.pc ? Number((((j.c - j.pc) / j.pc) * 100).toFixed(2)) : 0,
        max: j.h ?? j.c,
        min: j.l ?? j.c,
        source: 'finnhub'
      });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'fetch error' }, { status: 502 });
    }
  }

  // Batch de varios símbolos
  const list = symbolsParam?.split(',').map(s => s.trim()).filter(Boolean) || [];
  if (!list.length) {
    return NextResponse.json({ error: 'symbol or symbols required' }, { status: 400 });
  }

  try {
    const results = await Promise.all(list.map(async s => {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${token}`,
        { cache: 'no-store' }
      );
      const j = await r.json();
      if (!r.ok || j?.error || j.c == null) return { symbol: s, error: j?.error || `HTTP ${r.status}` };
      return {
        symbol: s,
        price: j.c,
        today: j.c && j.pc ? Number((((j.c - j.pc) / j.pc) * 100).toFixed(2)) : 0,
        max: j.h ?? j.c,
        min: j.l ?? j.c,
        source: 'finnhub'
      };
    }));
    return NextResponse.json({ data: results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch error' }, { status: 502 });
  }
}
