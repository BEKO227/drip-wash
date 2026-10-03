'use client';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { useDb } from '@/lib/db';
import { dayKey, dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

export default function ReportsPage() {
  const [from, setFrom] = useState(dayKey());
  const [to, setTo] = useState(dayKey());
  const db = useDb({ from: from <= to ? from : to, to: from <= to ? to : from });
  if (!db) return null;

  const [a, b] = from <= to ? [from, to] : [to, from];
  const orders = db.orders.filter((o) => o.day >= a && o.day <= b);
  const days = [...new Set(orders.map((o) => o.day))].sort();
  const period = a === b ? dayLabel(a) : `من ${dayLabel(a)} إلى ${dayLabel(b)}`;

  const setRange = (x, y) => { setFrom(x); setTo(y); };
  const t = dayKey();
  const exportPdf = () => {
    const old = document.title;
    document.title = 'Drip Wash ' + a + (a !== b ? ' to ' + b : '');
    window.print();
    document.title = old;
  };

  const btn = 'text-sm px-3 py-2 rounded-xl border border-line bg-card text-mut';
  const th = 'text-start font-semibold text-mut py-2 px-2 border-b border-line';
  const td = 'py-2 px-2 border-b border-line align-top';
  const dateInput = 'field mt-1 block w-full min-w-0 max-w-full appearance-none text-center';
  return (
    <>
      <div className="print:hidden">
        <h2 className="text-base text-mut font-semibold mt-5 mb-2.5">تقرير الحسابات</h2>
        <div className="card space-y-3 overflow-hidden">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="min-w-0 text-sm text-mut">من
              <input type="date" dir="ltr" className={dateInput} value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="min-w-0 text-sm text-mut">إلى
              <input type="date" dir="ltr" className={dateInput} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => setRange(t, t)}>النهاردة</button>
            <button className={btn} onClick={() => setRange(dayKey(new Date(Date.now() - 6 * 864e5)), t)}>آخر 7 أيام</button>
            <button className={btn} onClick={() => setRange(t.slice(0, 8) + '01', t)}>الشهر ده</button>
          </div>
          <button className="btn" onClick={exportPdf} disabled={!orders.length}>تصدير PDF</button>
        </div>
      </div>

      <section className="mt-5 print:mt-0">
        <div className="hidden print:flex items-center justify-between border-b border-line pb-3 mb-4">
          <Logo /><span className="text-sm">تقرير الحسابات</span>
        </div>
        <p className="text-lg font-bold">{period}</p>
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="card min-w-0"><small className="text-mut text-[13px]">إجمالي الحساب</small><strong className="block text-3xl">{num(total(orders))} <span className="text-sm font-medium">ج.م</span></strong></div>
          <div className="card min-w-0"><small className="text-mut text-[13px]">عدد العربيات</small><strong className="block text-3xl">{num(orders.length)}</strong></div>
        </div>

        <h3 className="font-semibold mt-5 mb-2">ملخص حسب الخدمة</h3>
        <div className="card">
          {db.services.map((s) => {
            let c = 0, r = 0;
            orders.forEach((o) => o.items.forEach((i) => { if (i.k === s.k) { c++; r += i.p; } }));
            return <div key={s.k} className="row"><span>{s.n}</span><span>{num(c)} مرة · <b>{num(r)} ج.م</b></span></div>;
          })}
        </div>

        {days.length > 1 && (
          <>
            <h3 className="font-semibold mt-5 mb-2">ملخص حسب اليوم</h3>
            <div className="card">
              {days.map((d) => {
                const l = orders.filter((o) => o.day === d);
                return <div key={d} className="row"><span>{dayLabel(d)} · {num(l.length)} عربية</span><b>{num(total(l))} ج.م</b></div>;
              })}
            </div>
          </>
        )}

        <h3 className="font-semibold mt-6 mb-2">تفاصيل العربيات</h3>
        {days.length ? days.map((d) => {
          const l = orders.filter((o) => o.day === d).sort((x, y) => x.ts - y.ts);
          return (
            <div key={d} className="card mb-4 overflow-x-auto">
              <div className="flex justify-between font-semibold mb-2">
                <span>{dayLabel(d)}</span><span>{num(l.length)} عربية · {num(total(l))} ج.م</span>
              </div>
              <table className="w-full text-sm min-w-[760px] print:min-w-0">
                <thead>
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>وقت الدخول</th>
                    <th className={th}>العربية</th>
                    <th className={th}>اللوحة</th>
                    <th className={th}>الخدمات</th>
                    <th className={th}>السعر (ج.م)</th>
                    <th className={th}>سجّلها</th>
                    <th className={th + ' print:hidden'}>التليفون</th>
                    <th className={th + ' print:hidden'}>الفاتورة</th>
                  </tr>
                </thead>
                <tbody>
                  {l.map((o, i) => (
                    <tr key={o.id} className="break-inside-avoid">
                      <td className={td}>{num(i + 1)}</td>
                      <td className={td}>{timeLabel(o.ts)}</td>
                      <td className={td}>{o.car}</td>
                      <td className={td}>{o.plate || '—'}</td>
                      <td className={td}>{itemsName(o)}</td>
                      <td className={td + ' font-semibold'}>{num(o.price)}</td>
                      <td className={td}>{o.byName || '—'}</td>
                      <td className={td + ' print:hidden'} dir="ltr">{o.phone || '—'}</td>
                      <td className={td + ' print:hidden'}>
                        {o.invoiceToken
                          ? <a className="text-brand2" href={`/invoice/${o.invoiceToken}`} target="_blank" rel="noreferrer">فاتورة</a>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 px-2 font-bold" colSpan={5}>إجمالي اليوم</td>
                    <td className="py-2 px-2 font-bold">{num(total(l))}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }) : <div className="text-mut text-center py-4 text-sm">مفيش عربيات في الفترة دي.</div>}
      </section>
    </>
  );
}