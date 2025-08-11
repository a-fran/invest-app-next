// lib/locale.ts (server)
import { headers } from 'next/headers';

export function getRequestLocale(defaultLocale = 'es-AR') {
  const h = headers();
  const al = h.get('accept-language') || '';
  const first = al.split(',')[0]?.trim();
  return first || defaultLocale;
}
