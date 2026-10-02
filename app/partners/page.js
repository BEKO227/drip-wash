'use client';
import { useState } from 'react';
import { useDb, useToday, ordersOf, updateOrder, deleteOrder } from '@/lib/db';
import { dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

const inp = 'w-full bg-card border border-line rounded-lg px-3 py-2 text-sm';
const PHONE = /^01[0125][0-9]{8}$/;

export default function TodayPage() {
  const today = useToday();
  const db = useDb({ from: today, to: today });
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!db) return null;
  const t = ordersOf(db, today);
  const list = db.services;

  const start = (o) => {
    setF({ car: o.car || '', plate: o.plate || '', phone: o.phone || '', price: String(o.price ?? '') });
    setErr('');
    setEditId(o.id);
  };
  const save = async (o) => {
    const price = Number(f.price), phone = f.phone.trim();
    if (!f.car.trim()) return setErr('اكتب اسم العربية');
    if (!(price > 0)) return setErr('السعر لازم يكون أكبر من صفر');
    if (phone && !PHONE.test(phone)) return setErr('رقم التليفون مش صحيح');
    if (f.plate.trim().length > 20) return setErr('اللوحة طويلة');
    setBusy(true);
    try { await updateOrder(o, { car: f.car, plate: f.plate, phone, price }); setEditId(null); }
    catch (e) { console.error(e); setErr('فشل الحفظ، جرّب تاني'); }
    setBusy(false);
  };
  const del = async (o) => {
    if (!window.confirm(`تمسح أوردر ${o.car}${o.plate ? ' · ' + o.plate : ''}؟ مينفعش ترجعه، ولينك الفاتورة هيبطل يشتغل.`)) return;
    setBusy(true);
    try { await deleteOrder(o); } catch (e) { console.error(e); setErr('فشل المسح، جرّب تاني'); }
    setBusy(false);
  };

  return (
    <>
      <p className="text-xl font-bold mb-2">{dayLabel(today)}</p>
      <div className="grid grid-cols-1 min-[421px]:grid-cols-[1.4fr_1fr] gap-2.5">
        <div className="rounded-2xl border border-brand p-4 bg-gradient-to-br from-brand/20 to-card to-70%">
          <small className="text-mut text-[13px]">إجمالي اليوم</small>
          <strong className="block text-[34px] leading-tight">{num(total(t))}<u className="no-underline text-sm text-mut font-medium mr-1">ج.م</u></strong>
        </div>
        <div className="card">
          <small className="text-mut text-[13px]">عدد العربيات</small>
          <strong className="block text-[34px] leading-tight">{num(t.length)}</strong>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        {list.map((s, i) => {
          let c = 0, r = 0;
          t.forEach((o) => o.items.forEach((it) => { if (it.k === s.k) { c++; r += it.p; } }));
          return (
            <div key={s.k} className={`flex justify-between bg-card border border-line rounded-xl px-3 py-2.5 text-sm ${i === list.length - 1 && list.length % 2 ? 'col-span-2' : ''}`}>
              <span>{s.n}</span><span><b className="text-brand2">{num(c)}</b> · {num(r)}</span>
            </div>
          );
        })}
      </div>
      <h2 className="text-base text-mut font-semibold mt-6 mb-2.5">تفاصيل اليوم</h2>
      <div className="card">
        {t.length ? t.map((o) => editId === o.id ? (
          <div key={o.id} className="py-3 border-b border-line last:border-0">
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="العربية" value={f.car} onChange={(e) => setF({ ...f, car: e.target.value })} />
              <input className={inp} placeholder="اللوحة" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} />
              <input className={inp} placeholder="التليفون" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <input className={inp} placeholder="السعر" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            </div>
            {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
            <div className="flex gap-2 mt-2">
              <button disabled={busy} onClick={() => save(o)} className="bg-brand text-white rounded-lg px-4 py-1.5 text-sm disabled:opacity-50">حفظ</button>
              <button disabled={busy} onClick={() => setEditId(null)} className="border border-line rounded-lg px-4 py-1.5 text-sm">إلغاء</button>
            </div>
          </div>
        ) : (
          <div key={o.id} className="row">
            <div>
              {o.car}{o.plate ? ' · ' + o.plate : ''}<br />
              <small className="text-mut">
                {itemsName(o)} · {timeLabel(o.ts)}{o.byName ? ' · سجّلها ' + o.byName : ''}
                {o.phone ? ' · ' + o.phone : ''}
              </small>
            </div>
            <div className="text-left">
              <b>{num(o.price)}</b>
              <br />
              <span className="text-sm">
                {o.invoiceToken && <><a className="text-brand2" href={`/invoice/${o.invoiceToken}`} target="_blank" rel="noreferrer">فاتورة</a> · </>}
                <button disabled={busy} onClick={() => start(o)} className="text-brand2">تعديل</button>
                {' · '}
                <button disabled={busy} onClick={() => del(o)} className="text-red-400">مسح</button>
              </span>
            </div>
          </div>
        )) : <div className="text-mut text-center py-4 text-sm">لسه مفيش عربيات النهاردة.</div>}
      </div>
    </>
  );
}