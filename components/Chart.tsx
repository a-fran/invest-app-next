'use client';
import { createChart, ColorType, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { SeriesPoint } from '@/lib/market';

export default function AreaChart({ data }: { data: SeriesPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#0b0f1a' : '#ffffff';
    const text = isDark ? '#cbd5e1' : '#0f172a';
    const grid = isDark ? '#1f2937' : '#e5e7eb';
    const line = isDark ? '#60a5fa' : '#1d4ed8';
    const areaTop = isDark ? 'rgba(96,165,250,0.45)' : 'rgba(29,78,216,0.35)';
    const areaBottom = isDark ? 'rgba(96,165,250,0.05)' : 'rgba(29,78,216,0.02)';
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      height: 320,
    });
    const series: ISeriesApi<'Area'> = chart.addAreaSeries({ lineWidth: 2, topColor: 'rgba(96,165,250,.55)', bottomColor: 'rgba(96,165,250,0)', lineColor: '#60a5fa' });
    series.setData(data);
    const ro = new ResizeObserver(() => chart.applyOptions({ width: ref.current!.clientWidth }));
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [data]);
  return <div ref={ref} />;
}
