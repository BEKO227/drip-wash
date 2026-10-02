'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TZ } from '@/lib/config';
import { num, svName } from '@/lib/format';

const stamp = (ts) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }).format(new Date(ts));

export default function InvoicePage() {
  const { token } = useParams();
  const [inv, setInv] = useState(undefined); // undefined = بيحمّل، null = مش موجودة
  const [noLogo, setNoLogo] = useState(false);

  useEffect(() => {
    if (!token) return;
    getDoc(doc(db, 'invoices', String(token)))
      .then((s) => setInv(s.exists() ? s.data() : null))
      .catch((e) => { console.error(e); setInv(null); });
  }, [token]);

  if (inv === undefined) return <p className="p-6 text-center">جاري التحميل...</p>;
  if (inv === null) return <p className="p-6 text-center">الفاتورة غير موجودة أو الرابط غير صحيح.</p>;

  return (
    <main className="mx-auto max-w-md p-4 print:max-w-none print:p-0">
      <style>{`
        @page { size: A5; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div dir="rtl" className="bg-white text-black rounded-2xl overflow-hidden shadow-lg print:shadow-none print:rounded-none">
        {/* الهيدر */}
        <div className="bg-black px-6 py-5 text-center">
          {noLogo ? (
            <h1 className="text-3xl font-extrabold text-white">Drip Wash</h1>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.png" alt="Drip Wash" className="mx-auto h-20 w-auto" onError={() => setNoLogo(true)} />
          )}
          <p className="mt-2 text-[11px] tracking-[0.25em] text-white/70">CLEAN • SHINE • PROTECT</p>
        </div>
        <div className="h-1.5 bg-brand" />

        <div className="px-6 py-5">
          <h2 className="text-center text-lg font-bold mb-4">فاتورة</h2>

          {/* بيانات الفاتورة */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-black/50">رقم الفاتورة</span><b dir="ltr" className="text-right">#{inv.no}</b>
            <span className="text-black/50">التاريخ والوقت</span><span>{stamp(inv.ts)}</span>
            <span className="text-black/50">العربية</span><span>{inv.car}</span>
            {inv.plate && (<><span className="text-black/50">اللوحة</span><b>{inv.plate}</b></>)}
            {inv.byName && (<><span className="text-black/50">أصدرها</span><span>{inv.byName}</span></>)}
          </div>

          {/* الخدمات */}
          <div className="mt-5 border-t border-black/20">
            <div className="flex justify-between py-2 text-xs text-black/50">
              <span>الخدمة</span><span>السعر</span>
            </div>
            {inv.items.map((it, i) => (
              <div key={i} className="flex justify-between py-2 border-t border-dashed border-black/20">
                <span>{it.n ?? svName(it.k)}</span>
                <span>{num(it.p)} ج.م</span>
              </div>
            ))}
          </div>

          {/* الإجمالي */}
          <div className="mt-3 flex justify-between items-center rounded-xl bg-black px-4 py-3 text-white">
            <span className="font-semibold">الإجمالي</span>
            <strong className="text-xl text-brand2">{num(inv.price)} ج.م</strong>
          </div>

          <p className="text-center text-sm mt-5">شكراً لزيارتكم 🚗✨</p>
          <p className="text-center text-[11px] text-black/40 mt-1">Drip Wash</p>
        </div>
      </div>

      <button className="btn mt-4 print:hidden" onClick={() => window.print()}>طباعة / حفظ PDF</button>
    </main>
  );
}