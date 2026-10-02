'use client';
import { useState } from 'react';
import { useDb, useToday, ordersOf } from '@/lib/db';
import { dayKey, dayLabel, timeLabel, itemsName, num, total } from '@/lib/format';

export default function ArchivePage() {
  const today = useToday();
  const db = useDb({ from: dayKey(new Date(Date.now() - 60 * 864e5)), to: today });
  const [open, setOpen] = useState(null);
  if (!db) return null;
  const days = [...new Set(db.orders.map((o) => o.day).filter((d) => d !== today))].sort().reverse();
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
                  {l.map((o) => (
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
                        {o.invoiceToken && (
                          <>
                            <br />
                            <a className="text-brand2 text-sm" href={`/invoice/${o.invoiceToken}`} target="_blank" rel="noreferrer">فاتورة</a>
                          </>
                        )}
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