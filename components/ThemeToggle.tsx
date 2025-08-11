'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const KEY = 'theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(KEY) as Theme | null;
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effective);
  // Tip: ayuda con formularios nativos
  root.style.colorScheme = effective;
  localStorage.setItem(KEY, theme);
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  // Primer render (evitar hidración rara)
  useEffect(() => {
    const initial = getStoredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  // Re-aplicar cuando cambia
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [mounted, theme]);

  // Cambios del SO si estamos en "system"
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Sync entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const v = getStoredTheme();
        setTheme(v);
        applyTheme(v);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!mounted) return null;

  return (
    <div
      role="tablist"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-zinc-300/60 dark:border-zinc-700/60 bg-white/70 dark:bg-zinc-800/70 p-1 gap-1"
    >
      {(['light','dark','system'] as const).map((opt) => {
        const active = theme === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => setTheme(opt)}
            className={[
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
            ].join(' ')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
