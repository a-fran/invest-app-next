'use client';
import { useFinnhubWS } from '@/lib/useFinnhubWS';
import ThemeToggle from '@/components/ThemeToggle';
import Money from '@/components/Money';
import PortfolioEditor from '@/components/PortfolioEditor';
import { loadPortfolio, savePortfolio, PortfolioRow } from '@/lib/portfolio';

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import AreaChart from "../components/Chart";
import { Card } from "../components/ui/Card";
import { HOLDINGS as DEFAULT_HOLDINGS, simulate, makeSeries } from "../lib/market";
import { fetchLivePrice } from "../lib/priceClient";

// 👇 tipos del chart para blindar la data
import type { AreaData, UTCTimestamp } from 'lightweight-charts';

type Snap = { price: number; today: number; max: number; min: number };

const initMarketFrom = (rows: PortfolioRow[]): Record<string, Snap> =>
  Object.fromEntries(rows.map((h) => [h.symbol, simulate(h.symbol)])) as any;

export default function IndexPage() {
  // Estado base
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const [holdings, setHoldings] = useState<PortfolioRow[]>(DEFAULT_HOLDINGS);
  const [market, setMarket] = useState<Record<string, Snap>>(initMarketFrom(DEFAULT_HOLDINGS));
  const [selected, setSelected] = useState<string>("NVDA");
  const [watch, setWatch] = useState(["NVDA", "AMD", "META", "TSLA"]);
  const [q, setQ] = useState("");

  // Al montar: onboarding si no hay cartera guardada
  useEffect(() => {
    const hasKey =
      typeof window !== 'undefined' ? localStorage.getItem('portfolio.v1') : null;

    if (!hasKey) {
      setHoldings([]);
      setMarket({});
      setOnboarding(true);
      setEditorOpen(true);
      setReady(true);
      return;
    }

    const stored = loadPortfolio([]);
    if (stored.length === 0) {
      setHoldings([]);
      setMarket({});
      setOnboarding(true);
      setEditorOpen(true);
      setReady(true);
      return;
    }

    setHoldings(stored);
    setMarket(initMarketFrom(stored));
    setSelected(stored[0]?.symbol || "");
    setReady(true);
  }, []);

  // Poll inicial/batch
  useEffect(() => {
    if (!ready || holdings.length === 0) return;
    let cancel = false;
    (async () => {
      for (const h of holdings) {
        const live = await fetchLivePrice(h.symbol);
        if (cancel) return;
        if (live) {
          setMarket((prev) => ({
            ...prev,
            [h.symbol]: { price: live.price, today: live.today, max: live.max, min: live.min },
          }));
        } else {
          setMarket((prev) => prev[h.symbol] ? prev : { ...prev, [h.symbol]: simulate(h.symbol) });
        }
      }
    })();
    return () => { cancel = true; };
  }, [ready, holdings.map(h => h.symbol).join('|')]);

  // Poll del seleccionado cada 20s
  useEffect(() => {
    if (!ready || !selected) return;
    let stop = false;
    const tick = async () => {
      const live = await fetchLivePrice(selected);
      if (stop || !live) return;
      setMarket((prev) => ({ ...prev, [selected]: {
        price: live.price, today: live.today, max: live.max, min: live.min
      }}));
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => { stop = true; clearInterval(id); };
  }, [ready, selected]);

  // WS: símbolos a seguir y merge de precios
  const liveSymbols = useMemo(
    () => Array.from(new Set(holdings.map(h => h.symbol).filter(Boolean))),
    [holdings]
  );
  const livePrices = useFinnhubWS(liveSymbols, true);

  useEffect(() => {
    const entries = Object.entries(livePrices);
    if (!entries.length) return;
    setMarket(prev => {
      const next = { ...prev };
      for (const [sym, p] of entries) {
        const snap = next[sym] ?? simulate(sym);
        next[sym] = { ...snap, price: p };
      }
      return next;
    });
  }, [livePrices]);

  // Derivados
  const rows = useMemo(() => {
    return holdings.map((h) => {
      const s = market[h.symbol] || simulate(h.symbol);
      const invested = h.qty * h.buyPrice;
      const value = h.qty * s.price;
      const pnl = value - invested;
      return { ...h, s, invested, value, pnl };
    });
  }, [market, holdings]);

  const kpis = useMemo(() => {
    const invested = rows.reduce((a, r) => a + r.invested, 0);
    const value = rows.reduce((a, r) => a + r.value, 0);
    const pnl = value - invested;
    const sorted = rows.length ? [...rows].sort((a, b) => b.s.today - a.s.today) : [];
    return { invested, value, pnl, top: sorted[0], worst: sorted[sorted.length - 1] };
  }, [rows]);

  const det = rows.find((r) => r.symbol === selected) ?? rows[0];

  // 👇 Blindaje de tipos para el chart
  const series = useMemo(
    () => makeSeries(det?.s.price ?? 100),
    [det?.s.price]
  ) as AreaData<UTCTimestamp>[];

  const add = () => {
    const t = q.trim().toUpperCase();
    if (!t) return;
    setWatch((w) => (w.includes(t) ? w : [...w, t]));
    setQ("");
  };

  if (!ready) return null;

  // Onboarding
  if (onboarding) {
    return (
      <>
        <header className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3l3.5 6H8.5L12 3zm0 18l-3.5-6h7L12 21z" fill="#60a5fa" />
            </svg>
            <h1 className="font-semibold">Invest App — Next</h1>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>

        <main className="min-h-[calc(100vh-56px)] grid place-items-center p-4">
          <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Cargá tu cartera para empezar</h2>
            <p className="text-slate-300 mb-4">
              Elegí los tickers y cantidades. Lo guardamos en tu dispositivo y después te mostramos gráficos y métricas en vivo.
            </p>
            <button className="chip hover:bg-white/10" onClick={() => setEditorOpen(true)}>
              Cargar cartera
            </button>
          </div>
        </main>

        <PortfolioEditor
          open={editorOpen}
          initial={holdings}
          onClose={() => setEditorOpen(false)}
          onSave={(rows) => {
            setHoldings(rows);
            savePortfolio(rows);
            setMarket(initMarketFrom(rows));
            if (rows.length > 0) setSelected(rows[0].symbol);
            setEditorOpen(false);
            setOnboarding(false);
          }}
        />
      </>
    );
  }

  // App normal
  const isLive = !!(det && livePrices[det.symbol] != null);

  return (
    <>
      {/* HEADER */}
      <header className="flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3l3.5 6H8.5L12 3zm0 18l-3.5-6h7L12 21z" fill="#60a5fa" />
          </svg>
          <h1 className="font-semibold">Invest App — Next</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setEditorOpen(true)} className="chip hover:bg-white/10">
            Editar cartera
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') localStorage.removeItem('portfolio.v1');
              setHoldings([]);
              setMarket({});
              setSelected("");
              setOnboarding(true);
              setEditorOpen(true);
            }}
            className="chip hover:bg-white/10"
          >
            Empezar de cero
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Agregar a watchlist (ej: NVDA)"
            className="w-64 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm outline-none"
          />
          <button onClick={add} className="chip hover:bg-white/10">Agregar</button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main>
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Card>
            <div className="text-sm text-blue-200/70">Valor de la cartera</div>
            <div className="text-2xl font-semibold mt-1"><Money value={kpis.value} /></div>
            <div className="text-sm mt-1">
              P&L:{" "}
              <span className={clsx(kpis.pnl >= 0 ? "text-emerald-400" : "text-rose-400","font-medium")}>
                {kpis.pnl >= 0 ? "+" : ""}<Money value={kpis.pnl} /> (
                {((kpis.pnl / (kpis.invested || 1)) * 100).toFixed(2)}%)
              </span>
            </div>
          </Card>
          <Card>
            <div className="text-sm text-blue-200/70">Aportes</div>
            <div className="text-2xl font-semibold mt-1"><Money value={kpis.invested} /></div>
            <div className="text-sm mt-1">Compra inicial + reinversiones</div>
          </Card>
          <Card>
            <div className="text-sm text-blue-200/70">Mejor del día</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="chip">{kpis.top?.symbol}</span>
              <span className="text-emerald-400">+{kpis.top?.s.today}%</span>
            </div>
          </Card>
          <Card>
            <div className="text-sm text-blue-200/70">Peor del día</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="chip">{kpis.worst?.symbol}</span>
              <span className="text-rose-400">{kpis.worst?.s.today}%</span>
            </div>
          </Card>
        </section>

        {/* LISTA + DETALLE */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
          {/* TABLA */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Cartera</h2>
              <span className="text-xs text-blue-200/60">
                {isLive ? 'LIVE (WebSocket) + Poll' : 'Poll periódico / Fallback simulado'}
              </span>
            </div>
            <div className="overflow-auto rounded-lg border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Activo</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Invertido</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-right">P&L</th>
                    <th className="px-3 py-2 text-right">Hoy</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.symbol} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="chip">{r.symbol}</span>
                          <span className="text-slate-300">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right"><Money value={r.s.price} /></td>
                      <td className="px-3 py-2 text-right">{r.qty}</td>
                      <td className="px-3 py-2 text-right"><Money value={r.invested} /></td>
                      <td className="px-3 py-2 text-right"><Money value={r.value} /></td>
                      <td className={clsx("px-3 py-2 text-right", r.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {r.pnl >= 0 ? "+" : ""}<Money value={r.pnl} />
                      </td>
                      <td className={clsx("px-3 py-2 text-right", r.s.today >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {r.s.today >= 0 ? "+" : ""}{r.s.today}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="chip hover:bg-white/10" onClick={() => setSelected(r.symbol)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* DETALLE */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Detalle</h2>
              <span className="chip">
                {det?.symbol}
                <span
                  className={`ml-2 inline-block h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                  title={isLive ? 'LIVE' : 'Sin ticks'}
                />
              </span>
            </div>
            <div className="mt-3"><AreaChart data={series} /></div>
            <div className="mt-3 text-sm grid grid-cols-2 gap-2">
              <div>Ticker: <span className="text-blue-300">{det?.symbol}</span></div>
              <div>Precio: <Money value={det?.s.price ?? 0} /></div>
              <div>
                Variación hoy:{" "}
                <span className={clsx((det?.s.today ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {(det?.s.today ?? 0) >= 0 ? "+" : ""}{det?.s.today ?? 0}%
                </span>
              </div>
              <div>Máx/Mín: <Money value={det?.s.max ?? 0} /> / <Money value={det?.s.min ?? 0} /></div>
              <a className="text-sky-300 hover:underline col-span-2" target="_blank" rel="noreferrer"
                 href={`https://www.bing.com/news/search?q=${encodeURIComponent((det?.symbol || '') + " stock news")}`}>
                Noticias del ticker ↗
              </a>
            </div>
          </Card>
        </section>

        {/* Notas + Watchlist */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-2">Notas</h2>
            <textarea
              placeholder="Observaciones del día, decisiones y próximos pasos…"
              className="w-full h-40 bg-white/5 border border-white/10 rounded-md p-3 text-sm outline-none"
            />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold mb-2">Watchlist</h2>
            <div className="flex flex-wrap gap-2">
              {watch.map((t) => (
                <button key={t} className="chip hover:bg-white/10" onClick={() => setSelected(t)}>{t}</button>
              ))}
            </div>
          </Card>
        </section>

        <footer className="py-6 text-center text-xs text-blue-200/60">
          Live vía Finnhub si configurás <code>FINNHUB_API_KEY</code> en <code>.env</code> (server) y
          <code> NEXT_PUBLIC_FINNHUB_API_KEY</code> (WS cliente). Caso contrario, se usa simulación/poll.
        </footer>
      </main>

      {/* Editor para editar luego */}
      <PortfolioEditor
        open={editorOpen}
        initial={holdings}
        onClose={() => setEditorOpen(false)}
        onSave={(rows) => {
          setHoldings(rows);
          savePortfolio(rows);
          setMarket(prev => {
            const next = { ...prev };
            for (const r of rows) if (!next[r.symbol]) next[r.symbol] = simulate(r.symbol);
            return next;
          });
          if (!rows.some(r => r.symbol === selected) && rows.length > 0) {
            setSelected(rows[0].symbol);
          }
          setEditorOpen(false);
        }}
      />
    </>
  );
}
