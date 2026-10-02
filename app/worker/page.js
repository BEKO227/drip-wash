'use client';
import { useState } from 'react';
import ServicePicker, { nextSel } from '@/components/ServicePicker';
import Guard from '@/components/Guard';
import PartnerTabs from '@/components/PartnerTabs';
import { useAuth } from '@/lib/auth';
import { useDb, useToday, addOrder, ordersOf } from '@/lib/db';
import { dayLabel, timeLabel, itemsName, num } from '@/lib/format';

export default function WorkerPage() {
  return <Guard role={['worker', 'partner']}><WorkerScreen /></Guard>;
}

function WorkerScreen() {
  const { user } = useAuth();
  const today = useToday();
  const db = useDb({ from: today, to: today });
  const [car, setCar] = useState('');
  const [sel, setSel] = useState([]);
  const [chemPrice, setChemPrice] = useState('');
  const [toast, setToast] = useState('');

  if (!db) return null;
  const chemP = chemPrice === '' ? db.prices.chem : Number(chemPrice) || 0;
  const priceOf = (k) => (k === 'chem' ? chemP : db.prices[k]);
  const sum = sel.reduce((a, k) => a + priceOf(k), 0);
  const list = ordersOf(db, today);

  const pick = (k) => { const r = nextSel(sel, k); setSel(r.sel); setToast(r.msg || ''); };
  const submit = () => {
    const name = car.trim();
    if (!name || !sel.length) return;
    addOrder(name, sel.map((k) => ({ k, p: priceOf(k) })), user);
    setToast('تم تسجيل ' + name); setCar(''); setSel([]); setChemPrice('');
    document.getElementById('car')?.focus();
  };

  return (
    <main>
      {user.role === 'partner' && <PartnerTabs />}
      <p className="text-xl font-bold">{dayLabel(today)}</p>
      <p className="text-mut text-[13px] my-1.5"></p>
      <div className="card">
        <input id="car" className="field" placeholder="نوع العربية (مثلاً: كورولا)" autoComplete="off" value={car} onChange={(e) => setCar(e.target.value)} />
        <p className="text-mut text-[13px] mt-3">اختار خدمة أو أكتر:</p>
        <ServicePicker sel={sel} prices={db.prices} onPick={pick} />
        {sel.includes('chem') && (
          <>
            <p className="text-mut text-[13px] mb-1.5">سعر الكيماوي الكامل حسب الحالة، عدّله لو مختلف:</p>
            <input className="field" type="number" inputMode="numeric" value={chemPrice === '' ? db.prices.chem : chemPrice} onChange={(e) => setChemPrice(e.target.value)} />
          </>
        )}
        <div className="flex justify-between items-center mt-3 mb-1 text-mut">
          <span>حساب العربية</span><strong className="text-brand2 text-[22px]">{num(sum)} ج.م</strong>
        </div>
        <button className="btn mt-1.5" disabled={!sel.length || !car.trim()} onClick={submit}>تسجيل العربية</button>
        <div className="text-ok text-sm min-h-5 mt-2 text-center">{toast}</div>
      </div>
      <h2 className="text-base text-mut font-semibold mt-6 mb-2.5">عربيات النهاردة ({num(list.length)})</h2>
      <div className="card">
        {list.length ? list.map((o) => (
          <div key={o.id} className="row">
            <div>{o.car}<br /><small className="text-mut">{itemsName(o)}</small></div>
            <small className="text-mut">{timeLabel(o.ts)}</small>
          </div>
        )) : <div className="text-mut text-center py-4 text-sm">لسه مفيش عربيات النهاردة. سجّل أول عربية من فوق.</div>}
      </div>
    </main>
  );
}
