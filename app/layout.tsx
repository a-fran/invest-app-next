import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Invest App — Next",
  description: "MVP de inversiones con Next.js + Tailwind + Lightweight Charts",
};

// Obtiene el locale del request para usar el MISMO en SSR y cliente
function getRequestLocale(defaultLocale = "es-AR") {
  const h = headers();
  const al = h.get("accept-language") || "";
  const first = al.split(",")[0]?.trim();
  return first || defaultLocale;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getRequestLocale("es-AR");

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica tema antes de hidratar (evita flash de tema) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              try {
                var k = 'theme';
                var t = localStorage.getItem(k) || 'system';
                var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var eff = t === 'system' ? (d ? 'dark' : 'light') : t;
                var r = document.documentElement;
                r.classList.remove('light','dark');
                r.classList.add(eff);
                // Acompaña controles nativos (inputs, scrollbars)
                r.style.colorScheme = eff;
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      {/* Clases duales para que el modo claro realmente se vea claro */}
      <body
        data-locale={locale}
        className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {children}
      </body>
    </html>
  );
}
