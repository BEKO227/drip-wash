'use client';
import { useState } from 'react';
import { useDb, savePrices, addService, deleteService } from '@/lib/db';

export default function PricesPage() {
  const db = useDb();
  const [vals, setVals] = useState({});
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!db) return null;

  const save = async () => {
    const out = {};
    db.services.forEach((s) => { const v = Number(vals[s.k]); if (v > 0) out[s.k] = v; });
    if (!Object.keys(out).length) { setToast('مفيش تعديل لحفظه'); return; }
    try {
      await savePrices(out);
      setVals({}); setToast('تم حفظ الأسعار');
    } catch (e) {
      console.error(e); setToast('حصل خطأ، الأسعار متحفظتش');
    }
  };

  const add = async () => {
    const name = newName.trim();
    const price = Number(newPrice);
    if (!name) { setAddMsg('اكتب اسم الخدمة'); return; }
    if (!(price > 0)) { setAddMsg('اكتب سعر أكبر من صفر'); return; }
    if (db.services.some((s) => s.n === name)) { setAddMsg('الخدمة دي موجودة بالفعل'); return; }
    setBusy(true);
    try {
      await addService(name, price);
      setNewName(''); setNewPrice(''); setAddMsg('تمت إضافة ' + name);
    } catch (e) {
      console.error(e); setAddMsg('حصل خطأ، الخدمة متضافتش');
    } finally {
      setBusy(false);
    }
  };

  const del = async (s) => {
    if (!window.confirm(`تمسح خدمة "${s.n}"؟ الأوردرات القديمة هتفضل محتفظة باسمها وسعرها.`)) return;
    setBusy(true);
    try {
      await deleteService(s);
      setVals((v) => { const n = { ...v }; delete n[s.k]; return n; });
      setToast('تم مسح ' + s.n);
    } catch (e) {
      console.error(e); setToast('حصل خطأ، الخدمة متمسحتش');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="text-base text-mut font-semibold mt-5 mb-2.5">أسعار الخدمات</h2>
      <div className="card">
        {db.services.map((s) => (
          <div key={s.k} className="flex items-center gap-2.5 mb-2.5">
            <label htmlFor={'p-' + s.k} className="flex-1">{s.n}{s.k === 'chem' && <small className="text-mut"> (الأساسي)</small>}</label>
            <input id={'p-' + s.k} type="number" inputMode="numeric" className="field !w-28 text-center"
              value={vals[s.k] ?? db.prices[s.k] ?? ''} onChange={(e) => setVals({ ...vals, [s.k]: e.target.value })} />
            <button disabled={busy} onClick={() => del(s)} className="w-10 text-red-400 text-sm">مسح</button>
          </div>
        ))}
        <button className="btn" onClick={save}>حفظ الأسعار</button>
        <div className="text-ok text-sm min-h-5 mt-2 text-center">{toast}</div>
      </div>

      <h2 className="text-base text-mut font-semibold mt-6 mb-2.5">إضافة خدمة جديدة</h2>
      <div className="card">
        <input className="field" placeholder="اسم الخدمة (مثلاً: تلميع)" autoComplete="off"
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input className="field mt-2.5" type="number" inputMode="numeric" placeholder="السعر بالجنيه"
          value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        <button className="btn mt-3" disabled={busy} onClick={add}>{busy ? 'جاري الإضافة...' : 'إضافة الخدمة'}</button>
        <div className="text-ok text-sm min-h-5 mt-2 text-center">{addMsg}</div>
      </div>
    </>
  );
}