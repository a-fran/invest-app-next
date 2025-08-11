'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Money from '@/components/Money';
import { PortfolioRow } from '@/lib/portfolio';

type Props = {
  open: boolean;
  initial: PortfolioRow[];
  onClose: () => void;
  onSave: (rows: PortfolioRow[]) => void;
};

export default function PortfolioEditor({ open, initial, onClose, onSave }: Props) {
  const [rows, setRows] = useState<PortfolioRow[]>(initial);

  useEffect(() => {
    if (open) setRows(initial);
  }, [open, initial]);

  const addRow = () =>
    setRows(prev => [...prev, { symbol: '', qty: 0, buyPrice: 0 }]);

  const removeRow = (i: number) =>
    setRows(prev => prev.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<PortfolioRow>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const valid = useMemo(() => rows.every(r => r.symbol.trim()), [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[min(960px,92vw)] max-h-[88vh] overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Cargar cartera</h2>
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="chip hover:bg-white/10"
              aria-label="Agregar fila"
            >
              + Agregar fila
            </button>
            <button
              onClick={() => onSave(rows)}
              disabled={!valid}
              className={clsx(
                'chip',
                valid ? 'hover:bg-white/10' : 'opacity-50 cursor-not-allowed'
              )}
            >
              Guardar
            </button>
            <button onClick={onClose} className="chip hover:bg-white/10">
              Cerrar
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Símbolo</th>
                <th className="px-3 py-2 text-left">Nombre (opcional)</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Precio compra</th>
                <th className="px-3 py-2 text-right">Invertido</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const invested = (Number(r.qty) || 0) * (Number(r.buyPrice) || 0);
                return (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <input
                        value={r.symbol}
                        onChange={e => update(i, { symbol: e.target.value.toUpperCase() })}
                        placeholder="NVDA"
                        className="w-28 bg-white/5 border border-white/10 rounded-md px-2 py-1 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.name || ''}
                        onChange={e => update(i, { name: e.target.value })}
                        placeholder="Nombre"
                        className="w-44 bg-white/5 border border-white/10 rounded-md px-2 py-1 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={r.qty}
                        onChange={e => update(i, { qty: Number(e.target.value) })}
                        className="w-28 text-right bg-white/5 border border-white/10 rounded-md px-2 py-1 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={r.buyPrice}
                        onChange={e => update(i, { buyPrice: Number(e.target.value) })}
                        className="w-28 text-right bg-white/5 border border-white/10 rounded-md px-2 py-1 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Money value={invested} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="chip hover:bg-white/10"
                        onClick={() => removeRow(i)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    Sin filas. Usá “+ Agregar fila” para empezar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sky-300">Importar pegando texto (opcional)</summary>
          <p className="text-xs text-slate-400 mt-1">
            Formato: <code>SIMBOLO, CANTIDAD, PRECIO</code> por línea. Ej: <code>NVDA, 5, 120</code>
          </p>
          <PasteImporter onApply={(list) => setRows(list)} />
        </details>
      </div>
    </div>
  );
}

function PasteImporter({ onApply }: { onApply: (rows: PortfolioRow[]) => void }) {
  const [txt, setTxt] = useState('');
  const parse = () => {
    const out: PortfolioRow[] = [];
    for (const line of txt.split(/\r?\n/)) {
      const parts = line.split(/[,;\t]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 1) {
        const symbol = parts[0].toUpperCase();
        const qty = Number(parts[1] || 0);
        const buyPrice = Number(parts[2] || 0);
        out.push({ symbol, qty, buyPrice });
      }
    }
    onApply(out);
  };
  return (
    <div className="mt-2">
      <textarea
        value={txt}
        onChange={e => setTxt(e.target.value)}
        rows={5}
        placeholder={"NVDA, 5, 120\nAAPL, 3, 180"}
        className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button className="chip hover:bg-white/10" onClick={parse}>Aplicar</button>
        <button className="chip hover:bg-white/10" onClick={() => setTxt('')}>Limpiar</button>
      </div>
    </div>
  );
}
