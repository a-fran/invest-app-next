// lib/useFinnhubWS.ts
'use client';

import { useEffect, useRef, useState } from 'react';

type PriceMap = Record<string, number>;

export function useFinnhubWS(symbols: string[], enabled = true) {
  const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  const [prices, setPrices] = useState<PriceMap>({});
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!enabled || !token || symbols.length === 0) return;

    let closed = false;

    const connect = () => {
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        // suscribimos cada símbolo
        const uniq = Array.from(new Set(symbols));
        for (const s of uniq) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: s }));
        }
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        // formato {type:"trade", data:[{p: price, s: symbol, ...}]}
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          // Throttle simple: aplicamos último precio por símbolo
          const acc: PriceMap = {};
          for (const t of msg.data) {
            if (t && t.s && typeof t.p === 'number') {
              acc[t.s] = t.p;
            }
          }
          if (Object.keys(acc).length) {
            setPrices((prev) => ({ ...prev, ...acc }));
          }
        }
      };

      ws.onclose = () => {
        if (closed) return;
        // backoff exponencial (máx ~5s)
        const delay = Math.min(5000, 300 * (retryRef.current + 1));
        retryRef.current++;
        setTimeout(() => !closed && connect(), delay);
      };

      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    };

    connect();

    return () => {
      closed = true;
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [enabled, token, symbols.join('|')]);

  return prices; // { AAPL: 229.12, NVDA: 123.45, ... }
}
