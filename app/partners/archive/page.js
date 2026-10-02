'use client';
import { useState } from 'react';
import { useDb, useToday, ordersOf, updateOrder, deleteOrder } from '@/lib/db';
import { dayKey, dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

const inp = 'w-full bg-card border border-line rounded-lg px-3 py-2 text-sm';
const PHONE = /^01[0125][0-9]{8}$/;

export default function ArchivePage() {
  const today = useToday();
  const db = useDb({ from: dayKey(new Date(Date.now() - 60 * 864e5)), to: today });
  const [open, setOpen] = useState(null);
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!db) return null;
  const days = [...new Set(db.orders.map((o) => o.day).filter((d) => d !== today))].sort().reverse();

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
      <h2 className="text-base text-mut font-semibold mt-5 mb-2.5">الأيام السابقة</h2>
      <div className="card">
        {days.length ? days.map((k) => {
          const l = ordersOf(db, k);
          return (
            <div key={k}>
              <button onClick={() => setOpen(open === k ? null : k)} className="row w-full text-start hover:bg-card2">
                <div>{dayLabel(k)}<br /><small className="text-mut">{num(l.length)} عربية</small></div>
                <b>{num(total(l))} ج.م</b>
              </button>
              {open === k && (
                <div className="bg-card2 rounded-xl px-3 py-1 my-1 mb-2">
                  {l.map((o) => editId === o.id ? (
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
                        <span>{num(o.price)}</span>
                        <br />
                        <span className="text-sm">
                          {o.invoiceToken && <><a className="text-brand2" href={`/invoice/${o.invoiceToken}`} target="_blank" rel="noreferrer">فاتورة</a> · </>}
                          <button disabled={busy} onClick={() => start(o)} className="text-brand2">تعديل</button>
                          {' · '}
                          <button disabled={busy} onClick={() => del(o)} className="text-red-400">مسح</button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }) : <div className="text-mut text-center py-4 text-sm">مفيش أيام سابقة لسه.</div>}
      </div>
    </>
  );
}