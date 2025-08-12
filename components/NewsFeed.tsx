// components/NewsFeed.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type Days = 1 | 3 | 7 | 14;

function timeAgo(epochSec: number) {
  const diffMs = Date.now() - epochSec * 1000;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function NewsFeed({ symbols }: { symbols: string[] }) {
  const list = useMemo(
    () => Array.from(new Set((symbols ?? []).map(s => s.trim().toUpperCase()))).slice(0, 10),
    [symbols]
  );

  const [days, setDays] = useState<Days>(7);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(12);
  const [loading, setLoading] = useState(false);

  const ctrlRef = useRef<AbortController | null>(null);

  const fetchNews = async () => {
    if (list.length === 0) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setVisible(12);

    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    try {
      const qs = new URLSearchParams({
        symbols: list.join(','),
        days: String(days),
      }).toString();

      const res = await fetch(`/api/news?${qs}`, { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit: probá de nuevo en 1-2 minutos.');
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const arr: NewsItem[] = (data.items ?? []).map((n: any) => ({
        symbol: n.symbol,
        datetime: n.datetime,
        headline: n.headline,
        source: n.source,
        url: n.url,
        image: n.image,
        summary: n.summary,
      }));

      // dedup + ordenar
      const byUrl = new Map<string, NewsItem>();
      for (const n of arr) if (!byUrl.has(n.url)) byUrl.set(n.url, n);
      const ordered = Array.from(byUrl.values()).sort((a, b) => b.datetime - a.datetime);

      setItems(ordered);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'Error cargando noticias');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    return () => ctrlRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, days]);

  const show = useMemo(() => (items || []).slice(0, visible), [items, visible]);

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-lg font-semibold">Noticias de tu cartera</h2>
        <div className="flex items-center gap-2">
          {/* rango */}
          <div role="tablist" aria-label="Rango" className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1 gap-1">
            {[1, 3, 7, 14].map((d) => {
              const active = days === d;
              return (
                <button
                  key={d}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDays(d as Days)}
                  className={[
                    'px-2.5 py-1 text-xs rounded-md',
                    active ? 'bg-white text-zinc-900' : 'hover:bg-white/10 text-slate-200',
                  ].join(' ')}
                >
                  {d === 1 ? '24h' : `${d}d`}
                </button>
              );
            })}
          </div>

          {/* símbolos */}
          <div className="hidden md:flex flex-wrap gap-1 text-xs">
            {list.map(s => (<span key={s} className="chip">{s}</span>))}
          </div>

          <button className="chip hover:bg-white/10" onClick={fetchNews} disabled={loading}>
            {loading ? 'Cargando…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {/* estados */}
      {error && (
        <div className="text-sm text-rose-400 mb-3">No pudimos cargar noticias: {error}</div>
      )}

      {loading && !items && (
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mb-2" />
              <div className="h-4 w-3/4 bg-white/10 rounded mb-1" />
              <div className="h-4 w-2/3 bg-white/10 rounded" />
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && !error && (
        <div className="text-sm text-slate-400">Sin noticias para este rango.</div>
      )}

      {/* lista */}
      {show.length > 0 && (
        <>
          <ul className="space-y-3">
            {show.map((n) => (
              <li key={n.url} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                <a href={n.url} target="_blank" rel="noreferrer" className="block">
                  <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                    <span className="chip">{n.symbol}</span>
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{timeAgo(n.datetime)}</span>
                  </div>
                  <div className="font-medium">{n.headline}</div>
                  {n.summary && (
                    <div className="text-sm text-slate-300 mt-1 line-clamp-2">{n.summary}</div>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {items && visible < items.length && (
            <div className="mt-4">
              <button className="chip hover:bg-white/10" onClick={() => setVisible(v => v + 12)}>
                Ver más
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
