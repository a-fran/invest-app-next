// components/NewsFeed.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';

type NewsItem = {
  symbol: string;
  datetime: number; // epoch seconds
  headline: string;
  source: string;
  url: string;
  image?: string;
  summary?: string;
};

export default function NewsFeed({ symbols }: { symbols: string[] }) {
  const list = useMemo(
    () =>
      Array.from(new Set((symbols ?? []).map(s => s.trim().toUpperCase()))).slice(0, 10),
    [symbols]
  );

  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (list.length === 0) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const qs = new URLSearchParams({ symbols: list.join(',') }).toString();
        const res = await fetch(`/api/news?${qs}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e?.message || 'Error cargando noticias');
      }
    })();
    return () => ctrl.abort();
  }, [list.join(',')]);

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Noticias de tu cartera</h2>
        <div className="flex flex-wrap gap-1 text-xs">
          {list.map(s => (
            <span key={s} className="chip">{s}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-400">No pudimos cargar noticias: {error}</div>
      )}

      {!items && !error && (
        <div className="text-sm text-slate-400">Cargando noticias…</div>
      )}

      {items && items.length === 0 && !error && (
        <div className="text-sm text-slate-400">Sin noticias recientes.</div>
      )}

      <ul className="space-y-3">
        {items?.map((n) => (
          <li key={n.url} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <a href={n.url} target="_blank" rel="noreferrer" className="block">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <span className="chip">{n.symbol}</span>
                <span>{n.source}</span>
                <span>·</span>
                <time>
                  {new Date(n.datetime * 1000).toLocaleString('es-AR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
              <div className="font-medium">{n.headline}</div>
              {n.summary && (
                <div className="text-sm text-slate-300 mt-1 line-clamp-2">{n.summary}</div>
              )}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
