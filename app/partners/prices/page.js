'use client';
import { useState } from 'react';
import { SERVICES } from '@/lib/config';
import { useDb, savePrices } from '@/lib/db';

export default function PricesPage() {
  const db = useDb();
  const [vals, setVals] = useState({});
  const [toast, setToast] = useState('');
  if (!db) return null;
  const save = () => {
    const out = {};
    SERVICES.forEach((s) => { const v = Number(vals[s.k]); if (v > 0) out[s.k] = v; });
    savePrices(out); setVals({}); setToast('تم حفظ الأسعار');
  };
  return (
    <>
      <h2 className="text-base text-mut font-semibold mt-5 mb-2.5">أسعار الخدمات</h2>
      <div className="card">
        {SERVICES.map((s) => (
          <div key={s.k} className="flex items-center gap-2.5 mb-2.5">
            <label htmlFor={'p-' + s.k} className="flex-1">{s.n}{s.k === 'chem' && <small className="text-mut"> (الأساسي)</small>}</label>
            <input id={'p-' + s.k} type="number" inputMode="numeric" className="field !w-28 text-center"
              value={vals[s.k] ?? db.prices[s.k]} onChange={(e) => setVals({ ...vals, [s.k]: e.target.value })} />
          </div>
        ))}
        <button className="btn" onClick={save}>حفظ الأسعار</button>
        <div className="text-ok text-sm min-h-5 mt-2 text-center">{toast}</div>
      </div>
    </>
  );
}
