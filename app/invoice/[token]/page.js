'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    getDoc(doc(db, 'invoices', String(token)))
      .then((s) => setInv(s.exists() ? s.data() : null))
      .catch((e) => { console.error(e); setInv(null); });
  }, [token]);

  // بيعمل ملف PDF فعلي (بيشتغل على الموبايل) ويفتح قايمة المشاركة أو ينزّله
  const savePdf = async () => {
    if (!cardRef.current) return;
    setPdfBusy(true);
    setPdfErr('');
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const m = 8;
      let w = pw - m * 2;
      let h = (canvas.height * w) / canvas.width;
      if (h > ph - m * 2) { h = ph - m * 2; w = (canvas.width * h) / canvas.height; }
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pw - w) / 2, m, w, h);

      const name = `invoice-${inv.no}.pdf`;
      const blob = pdf.output('blob');
      const file = new File([blob], name, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `فاتورة #${inv.no}` });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return; // المستخدم قفل القايمة
          // أي خطأ تاني: نكمّل للتنزيل العادي
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error(e);
      setPdfErr('معرفناش نجهّز الـ PDF، جرّب تاني');
    } finally {
      setPdfBusy(false);
    }
  };

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

      <div ref={cardRef} dir="rtl" className="bg-white text-black rounded-2xl overflow-hidden shadow-lg print:shadow-none print:rounded-none">
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

      <div className="mt-4 space-y-2 print:hidden">
        <button className="btn" disabled={pdfBusy} onClick={savePdf}>{pdfBusy ? 'جاري تجهيز الـ PDF...' : 'حفظ / مشاركة PDF'}</button>
        <button className="btn" onClick={() => window.print()}>طباعة</button>
        {pdfErr && <div className="text-red-400 text-sm text-center">{pdfErr}</div>}
      </div>
    </main>
  );
}