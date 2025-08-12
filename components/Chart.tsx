'use client';

import {
  createChart,
  ColorType,
  type ISeriesApi,
  type AreaData,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

// Usamos el tipo de la lib directamente
type Point = AreaData<UTCTimestamp>;

export default function AreaChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const isDark = document.documentElement.classList.contains('dark');
    const bg = isDark ? '#0b0f1a' : '#ffffff';
    const text = isDark ? '#cbd5e1' : '#0f172a';
    const grid = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
    const line = isDark ? '#60a5fa' : '#1d4ed8';
    const areaTop = isDark ? 'rgba(96,165,250,0.45)' : 'rgba(29,78,216,0.35)';
    const areaBottom = isDark ? 'rgba(96,165,250,0.05)' : 'rgba(29,78,216,0.03)';

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 320,
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const series: ISeriesApi<'Area'> = chart.addAreaSeries({
      lineWidth: 2,
      topColor: areaTop,
      bottomColor: areaBottom,
      lineColor: line,
    });

    series.setData(data); // ya es AreaData<UTCTimestamp>[]

    const ro = new ResizeObserver(() => {
      if (!ref.current) return;
      chart.applyOptions({ width: ref.current.clientWidth });
    });
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, [data]);

  return <div ref={ref} className="w-full" />;
}