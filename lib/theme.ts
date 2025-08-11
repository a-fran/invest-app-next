export type Theme = 'light'|'dark'|'system';
const KEY='theme';

export function getTheme(): Theme {
  if (typeof window==='undefined') return 'system';
  return (localStorage.getItem(KEY) as Theme) || 'system';
}

export function applyTheme(t: Theme) {
  if (typeof document==='undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const eff = t === 'system' ? (prefersDark ? 'dark':'light') : t;
  root.classList.remove('light','dark');
  root.classList.add(eff);
  localStorage.setItem(KEY, t);
}

export function initTheme() {
  try { applyTheme(getTheme()); } catch {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const cb = () => { if (getTheme()==='system') applyTheme('system'); };
  mq.addEventListener?.('change', cb);
}
