// lib/useLocale.ts
'use client';

export function useLocale(defaultLocale = 'es-AR') {
  if (typeof document === 'undefined') return defaultLocale;
  return document.body.getAttribute('data-locale') || defaultLocale;
}
