'use client';
import { SERVICES } from '@/lib/config';
import { useDb, useToday, ordersOf } from '@/lib/db';
import { dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

export default function TodayPage() {
  const today = useToday();
  const db = useDb({ from: today, to: today });
  if (!db) return null;
  const t = ordersOf(db, today);
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
        {SERVICES.map((s, i) => {
          let c = 0, r = 0;
          t.forEach((o) => o.items.forEach((it) => { if (it.k === s.k) { c++; r += it.p; } }));
          return (
            <div key={s.k} className={`flex justify-between bg-card border border-line rounded-xl px-3 py-2.5 text-sm ${i === SERVICES.length - 1 && SERVICES.length % 2 ? 'col-span-2' : ''}`}>
              <span>{s.n}</span><span><b className="text-brand2">{num(c)}</b> · {num(r)}</span>
            </div>
          );
        })}
      </div>
      <h2 className="text-base text-mut font-semibold mt-6 mb-2.5">تفاصيل اليوم</h2>
      <div className="card">
        {t.length ? t.map((o) => (
          <div key={o.id} className="row">
            <div>{o.car}<br /><small className="text-mut">{itemsName(o)} · {timeLabel(o.ts)}{o.byName ? ' · سجّلها ' + o.byName : ''}</small></div>
            <b>{num(o.price)}</b>
          </div>
        )) : <div className="text-mut text-center py-4 text-sm">لسه مفيش عربيات النهاردة.</div>}
      </div>
    </>
  );
}
