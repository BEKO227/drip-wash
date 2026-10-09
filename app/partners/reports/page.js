'use client';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { useDb } from '@/lib/db';
import { listen, washName } from '@/lib/subs';
import { dayKey, dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

const TYPES = ['full', 'vip', 'ext'];
const evDay = (e) => dayKey(new Date(e.ts));

export default function ReportsPage() {
  const [from, setFrom] = useState(dayKey());
  const [to, setTo] = useState(dayKey());
  const [subs, setSubs] = useState(null);
  const db = useDb({ from: from <= to ? from : to, to: from <= to ? to : from });

  useEffect(() => listen('subscriptions', setSubs), []);

  if (!db || !subs) return null;

  const [a, b] = from <= to ? [from, to] : [to, from];
  const orders = db.orders.filter((o) => o.day >= a && o.day <= b);
  const washOrders = orders.filter((o) => o.subId); // غسلات من الباقات (سعرها 0)
  const days = [...new Set(orders.map((o) => o.day))].sort();
  const period = a === b ? dayLabel(a) : `من ${dayLabel(a)} إلى ${dayLabel(b)}`;

  // إيراد الاشتراكات: كل اشتراك جديد وكل تجديد بيتحسب في يوم دفعه
  const subEvents = subs
    .flatMap((s) => [
      { ts: s.createdAt, price: Number(s.price) || 0, s, type: 'اشتراك جديد', token: s.invoiceToken },
      ...(s.renewals || []).map((r) => ({ ts: r.ts, price: Number(r.price) || 0, s, type: 'تجديد', token: r.token })),
    ])
    .filter((e) => { const d = evDay(e); return d >= a && d <= b; })
    .sort((x, y) => x.ts - y.ts);
  const subTotal = subEvents.reduce((acc, e) => acc + e.price, 0);
  const allDays = [...new Set([...orders.map((o) => o.day), ...subEvents.map(evDay)])].sort();

  // عدد الغسلات من الباقات حسب النوع
  const byType = {};
  washOrders.forEach((o) => o.items.forEach((i) => { byType[i.k] = (byType[i.k] || 0) + 1; }));

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
  const badge = 'mx-1 rounded border border-brand px-1 text-[11px] text-brand2';
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
          <button className="btn" onClick={exportPdf} disabled={!orders.length && !subEvents.length}>تصدير PDF</button>
        </div>
      </div>

      <section className="mt-5 print:mt-0">
        <div className="hidden print:flex items-center justify-between border-b border-line pb-3 mb-4">
          <Logo /><span className="text-sm">تقرير الحسابات</span>
        </div>
        <p className="text-lg font-bold">{period}</p>
        <div className="grid grid-cols-2 gap-2.5 my-3">
          <div className="card min-w-0"><small className="text-mut text-[13px]">إجمالي الإيراد</small><strong className="block text-3xl">{num(total(orders) + subTotal)} <span className="text-sm font-medium">ج.م</span></strong></div>
          <div className="card min-w-0">
            <small className="text-mut text-[13px]">عدد العربيات</small><strong className="block text-3xl">{num(orders.length)}</strong>
            {washOrders.length > 0 && <small className="text-mut text-[12px]">منها {num(washOrders.length)} من الباقات</small>}
          </div>
          <div className="card min-w-0"><small className="text-mut text-[13px]">حساب العربيات</small><strong className="block text-2xl">{num(total(orders))} <span className="text-sm font-medium">ج.م</span></strong></div>
          <div className="card min-w-0">
            <small className="text-mut text-[13px]">إيراد الاشتراكات</small><strong className="block text-2xl">{num(subTotal)} <span className="text-sm font-medium">ج.م</span></strong>
            <small className="text-mut text-[12px]">{num(subEvents.length)} اشتراك / تجديد</small>
          </div>
        </div>

        <h3 className="font-semibold mt-5 mb-2">ملخص حسب الخدمة</h3>
        <div className="card">
          {db.services.map((s) => {
            let c = 0, r = 0;
            orders.forEach((o) => o.items.forEach((i) => { if (i.k === s.k) { c++; r += i.p * (1 - (o.discountPct || 0) / 100); } }));
            return <div key={s.k} className="row"><span>{s.n}</span><span>{num(c)} مرة · <b>{num(Math.round(r))} ج.م</b></span></div>;
          })}
        </div>

        {washOrders.length > 0 && (
          <>
            <h3 className="font-semibold mt-5 mb-2">غسلات الباقات (مدفوعة وقت الاشتراك)</h3>
            <div className="card">
              {TYPES.filter((k) => byType['sub-' + k]).map((k) => (
                <div key={k} className="row"><span>{washName(k)}</span><span>{num(byType['sub-' + k])} مرة</span></div>
              ))}
            </div>
          </>
        )}

        {allDays.length > 1 && (
          <>
            <h3 className="font-semibold mt-5 mb-2">ملخص حسب اليوم</h3>
            <div className="card">
              {allDays.map((d) => {
                const l = orders.filter((o) => o.day === d);
                const ev = subEvents.filter((e) => evDay(e) === d);
                const evSum = ev.reduce((acc, e) => acc + e.price, 0);
                return (
                  <div key={d} className="row">
                    <span>{dayLabel(d)} · {num(l.length)} عربية{ev.length ? ` · ${num(ev.length)} اشتراك` : ''}</span>
                    <b>{num(total(l) + evSum)} ج.م</b>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {subEvents.length > 0 && (
          <>
            <h3 className="font-semibold mt-6 mb-2">الاشتراكات في الفترة</h3>
            <div className="card mb-4 overflow-x-auto">
              <table className="w-full text-sm min-w-[620px] print:min-w-0">
                <thead>
                  <tr>
                    <th className={th}>التاريخ</th>
                    <th className={th}>العميل</th>
                    <th className={th}>الباقة</th>
                    <th className={th}>النوع</th>
                    <th className={th}>المبلغ (ج.م)</th>
                    <th className={th + ' print:hidden'}>الفاتورة</th>
                  </tr>
                </thead>
                <tbody>
                  {subEvents.map((e, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <td className={td}>{dayLabel(evDay(e))}<br /><small className="text-mut">{timeLabel(e.ts)}</small></td>
                      <td className={td}>{e.s.customerName}<br /><small className="text-mut">{e.s.plate}</small></td>
                      <td className={td} dir="ltr">{e.s.planName}</td>
                      <td className={td}>{e.type}</td>
                      <td className={td + ' font-semibold'}>{num(e.price)}</td>
                      <td className={td + ' print:hidden'}>
                        {e.token
                          ? <a className="text-brand2" href={`/invoice/${e.token}`} target="_blank" rel="noreferrer">فاتورة</a>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 px-2 font-bold" colSpan={4}>إجمالي الاشتراكات</td>
                    <td className="py-2 px-2 font-bold">{num(subTotal)}</td>
                    <td className="print:hidden" />
                  </tr>
                </tbody>
              </table>
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
                      <td className={td}>{itemsName(o)}{o.subId && <span className={badge}>🔖 من الباقة</span>}</td>
                      <td className={td + ' font-semibold'}>{o.subId ? '0 (باقة)' : num(o.price)}</td>
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