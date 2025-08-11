# Invest App — Next.js 14 + Tailwind (MVP)

MVP de dashboard de inversiones listo para conectar a datos reales.

## Requisitos
- Node 18+
- pnpm o npm
- Claves opcionales en `.env` (ver `.env.example`).

## Inicio rápido
```bash
pnpm i   # o npm install
pnpm dev # o npm run dev
```

## Qué incluye
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS dark UI
- Lightweight Charts para el gráfico
- Datos simulados (reemplazables por API real)
- Watchlist, KPIs, tabla, notas

## Próximos pasos sugeridos
- Crear route handlers `/api/price?symbol=NVDA` que llamen a Finnhub/Polygon
- Persistir cartera en Supabase (tablas: holdings, trades, notes)
- Página de detalle `/ticker/[symbol]` con más métricas y noticias
- Soporte CEDEARs (ratio + CCL) en utilidades

---
Hecho para iterar rápido. 🎯
