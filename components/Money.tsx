'use client';
import { useEffect, useMemo, useState } from 'react';

// Lee el locale que pusimos en <body data-locale="..."> desde layout.tsx
function getLocale(defaultLocale = 'es-AR') {
  if (typeof document === 'undefined') return defaultLocale; // SSR no formatea
  return document.body.getAttribute('data-locale') || defaultLocale;
}

type Props = {
  value: number;
  currency?: string; // 'USD', 'ARS', etc.
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export default function Money({
  value,
  currency = 'USD',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: Props) {
  // Evitamos renderizar texto en SSR para no desmatch con el servidor
  const isSSR = typeof window === 'undefined';
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const text = useMemo(() => {
    if (!mounted) return ''; // hasta montar, no ponemos texto
    const locale = getLocale('es-AR');
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }, [mounted, value, currency, minimumFractionDigits, maximumFractionDigits]);

  // suppressHydrationWarning evita el mismatch porque SSR deja vacío y cliente llena
  return <span suppressHydrationWarning>{text}</span>;
}
