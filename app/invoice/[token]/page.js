'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TZ } from '@/lib/config';
import { num, svName } from '@/lib/format';
import { buckets, washName, TYPE_NOTE, ENGINE_OFFER } from '@/lib/subs';

const stamp = (ts) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }).format(new Date(ts));
const dstamp = (ts) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, dateStyle: 'long' }).format(new Date(ts));
const carKind = (c) => (c === 'suv' ? 'SUV / كروس أوفر' : 'سيدان');

// ألوان inline عشان تظهر صح في الشاشة والطباعة والـ PDF
const ORANGE = '#ff8a1f';
const SOFT = '#fff4e8';

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

  // فاتورة باقة: sub.kind = 'start' (فاتورة الاشتراك) أو 'wash' (غسلة من الباقة)
  const sub = inv.sub;
  const isRenew = sub?.kind === 'renew';
  const isStart = sub?.kind === 'start' || isRenew; // فاتورة اشتراك أو تجديد
  const isWash = sub?.kind === 'wash';
  const rows = sub ? buckets(sub) : [];
  const all = rows.reduce((a, b) => a + b.total, 0);
  const usedAll = rows.reduce((a, b) => a + b.used, 0);
  const title = isRenew ? 'فاتورة تجديد اشتراك' : isStart ? 'فاتورة اشتراك باقة' : isWash ? 'غسلة من باقة اشتراك' : 'فاتورة';

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
          <h2 className="text-center text-lg font-bold mb-4">{title}</h2>

          {/* تأكيد إن العميل اشترك */}
          {isStart && (
            <div className="mb-4 rounded-xl p-3 text-center" style={{ border: `2px solid ${ORANGE}`, backgroundColor: SOFT }}>
              <div className="font-extrabold">{isRenew ? '🔄 تم تجديد الاشتراك' : '✅ تم الاشتراك بنجاح'}</div>
              <div className="text-sm mt-1">
                {isRenew ? 'جدّد' : 'اشترك'} العميل <b>{sub.customerName}</b> في باقة <b dir="ltr">{sub.planName}</b>
              </div>
              <div className="text-sm">لمدة 30 يوم، من {dstamp(sub.startDate)} إلى {dstamp(sub.endDate)}</div>
            </div>
          )}

          {/* ملحوظة واضحة إن الغسلة تابعة لباقة */}
          {isWash && (
            <div className="mb-4 rounded-xl p-3 text-center" style={{ border: `2px solid ${ORANGE}`, backgroundColor: SOFT }}>
              <div className="font-extrabold">🔖 هذه الغسلة تابعة لباقة اشتراك</div>
              <div dir="ltr" className="font-bold" style={{ color: '#e86f00' }}>{sub.planName}</div>
              <div className="text-sm mt-1">{washName(sub.washType)} · رقم {num(sub.washNo)} من {num(sub.washOf)}</div>
            </div>
          )}

          {/* بيانات الفاتورة */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <span className="text-black/50">رقم الفاتورة</span><b dir="ltr" className="text-right">#{inv.no}</b>
            <span className="text-black/50">التاريخ والوقت</span><span>{stamp(inv.ts)}</span>
            {sub && (<><span className="text-black/50">العميل</span><b>{sub.customerName}</b></>)}
            <span className="text-black/50">العربية</span><span>{inv.car}</span>
            {inv.plate && (<><span className="text-black/50">اللوحة</span><b>{inv.plate}</b></>)}
            {sub && (<><span className="text-black/50">الباقة</span><b dir="ltr" className="text-right">{sub.planName} ({carKind(sub.car)})</b></>)}
            {isStart && (<><span className="text-black/50">بداية الاشتراك</span><span>{dstamp(sub.startDate)}</span></>)}
            {sub && (<><span className="text-black/50">{isStart ? 'نهاية الاشتراك' : 'ينتهي الاشتراك'}</span><b>{dstamp(sub.endDate)}</b></>)}
            {inv.byName && (<><span className="text-black/50">أصدرها</span><span>{inv.byName}</span></>)}
          </div>

          {/* الخدمات */}
          <div className="mt-5 border-t border-black/20">
            <div className="flex justify-between py-2 text-xs text-black/50">
              <span>{isStart ? 'الباقة' : 'الخدمة'}</span><span>السعر</span>
            </div>
            {inv.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 py-2 border-t border-dashed border-black/20">
                <span>{it.n ?? svName(it.k)}</span>
                <span className="shrink-0">{isWash ? 'من الباقة' : `${num(it.p)} ج.م`}</span>
              </div>
            ))}
            {/* الخصم: السعر قبل الخصم، النسبة، قيمة الخصم */}
            {!sub && inv.discountPct > 0 && (
              <div className="space-y-1 border-t border-black/20 py-2 text-sm">
                <div className="flex justify-between"><span className="text-black/60">الإجمالي قبل الخصم</span><span>{num(inv.subtotal)} ج.م</span></div>
                <div className="flex justify-between font-semibold" style={{ color: '#e86f00' }}><span>خصم {num(inv.discountPct)}%</span><span>- {num(inv.discountAmount)} ج.م</span></div>
              </div>
            )}
          </div>

          {/* رصيد الباقة لكل نوع غسلة */}
          {sub && (
            <div className="mt-4 border-t border-black/20">
              <div className="py-2 text-xs text-black/50">رصيد غسلات الباقة</div>
              <div className="grid grid-cols-4 pb-1 text-center text-xs text-black/50">
                <span className="text-start">النوع</span><span>الإجمالي</span><span>المستخدم</span><span>المتبقي</span>
              </div>
              {rows.map((b) => (
                <div key={b.kind} className="grid grid-cols-4 items-center border-t border-dashed border-black/20 py-2 text-center text-sm"
                  style={isWash && b.kind === sub.washKind ? { backgroundColor: SOFT } : undefined}>
                  <span className="text-start font-semibold">
                    {washName(b.type)}
                    <small className="block text-[10px] font-normal text-black/50">{TYPE_NOTE[b.type]}{b.kind === 'free' ? ' · مجانية' : ''}</small>
                  </span>
                  <span>{num(b.total)}</span><span>{num(b.used)}</span><b>{num(b.total - b.used)}</b>
                </div>
              ))}
              <div className="grid grid-cols-4 border-t border-black/20 py-2 text-center text-sm font-bold">
                <span className="text-start">الإجمالي</span><span>{num(all)}</span><span>{num(usedAll)}</span><span>{num(all - usedAll)}</span>
              </div>
            </div>
          )}

          {/* الإجمالي */}
          <div
            className="mt-3 flex justify-between items-center rounded-xl px-4 py-3"
            style={{ backgroundColor: '#000000', color: '#ffffff' }}
          >
            <span className="font-semibold" style={{ color: '#ffffff' }}>{isWash ? 'المطلوب دفعه' : inv.discountPct > 0 ? 'الإجمالي بعد الخصم' : 'الإجمالي'}</span>
            <span className="text-xl font-bold" style={{ color: ORANGE }}>
              {isWash ? 'من الباقة' : `${num(inv.price)} ج.م`}
            </span>
          </div>

          {/* عرض كيماوي الموتور لمشتركي الباقات */}
          {sub && all >= ENGINE_OFFER.minWashes && (
            <div className="mt-4 rounded-xl p-3 text-center text-sm" style={{ border: `2px dashed ${ORANGE}`, backgroundColor: SOFT }}>
              <div className="font-extrabold">🔧 عرض خاص لمشتركي الباقات</div>
              <div className="mt-1">
                كيماوي الموتور بـ <b style={{ color: '#e86f00' }}>{num(ENGINE_OFFER.price)} جنيه</b> بدل <s>{num(ENGINE_OFFER.was)} جنيه</s>
              </div>
              <div className="mt-1 text-[11px] text-black/50">مع باقات 6 و 9 غسلات</div>
            </div>
          )}

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