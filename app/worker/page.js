'use client';
import { useState } from 'react';
import ServicePicker, { nextSel } from '@/components/ServicePicker';
import Guard from '@/components/Guard';
import PartnerTabs from '@/components/PartnerTabs';
import { useAuth } from '@/lib/auth';
import { useDb, useToday, addOrder, ordersOf } from '@/lib/db';
import { dayLabel, timeLabel, itemsName, num } from '@/lib/format';

const PHONE_RE = /^01[0125]\d{8}$/;
const cleanPlate = (s) => s.trim().replace(/\s+/g, ' ');
const invoiceUrl = (token) => `${window.location.origin}/invoice/${token}`;
const waLink = (phone, token, price) =>
  `https://wa.me/20${phone.slice(1)}?text=${encodeURIComponent(
    `شكراً لزيارتكم Drip Wash 🚗✨\nإجمالي فاتورتك ${price} جنيه.\nتقدر تشوف الفاتورة من هنا:\n${invoiceUrl(token)}`
  )}`;

export default function WorkerPage() {
  return <Guard role={['worker', 'partner']}><WorkerScreen /></Guard>;
}

function WorkerScreen() {
  const { user } = useAuth();
  const today = useToday();
  const db = useDb({ from: today, to: today });
  const [car, setCar] = useState('');
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const [sel, setSel] = useState([]);
  const [chemPrice, setChemPrice] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null); // آخر فاتورة اتسجلت

  if (!db) return null;
  const chemP = chemPrice === '' ? db.prices.chem : Number(chemPrice) || 0;
  const priceOf = (k) => (k === 'chem' ? chemP : db.prices[k] ?? 0);
  const nameOf = (k) => db.services.find((s) => s.k === k)?.n ?? k;
  const sum = sel.reduce((a, k) => a + priceOf(k), 0);
  const list = ordersOf(db, today);
  const ready = sel.length > 0 && car.trim() && cleanPlate(plate) && PHONE_RE.test(phone);

  const pick = (k) => { const r = nextSel(sel, k); setSel(r.sel); setToast(r.msg || ''); };

  const submit = async () => {
    const name = car.trim();
    const pl = cleanPlate(plate);
    if (busy) return;
    if (!name) { setToast('اكتب نوع العربية'); return; }
    if (!pl) { setToast('اكتب رقم اللوحة'); return; }
    if (!PHONE_RE.test(phone)) { setToast('رقم التليفون لازم يكون 11 رقم يبدأ بـ 01'); return; }
    if (!sel.length) { setToast('اختار خدمة واحدة على الأقل'); return; }
    setBusy(true);
    try {
      const items = sel.map((k) => ({ k, n: nameOf(k), p: priceOf(k) }));
      const r = await addOrder(name, items, user, phone, pl);
      setLast({ ...r, car: name, plate: pl, phone });
      setToast('تم تسجيل ' + name);
      setCar(''); setPlate(''); setPhone(''); setSel([]); setChemPrice('');
      document.getElementById('car')?.focus();
    } catch (e) {
      console.error(e);
      setToast('حصل خطأ ومتسجلتش العربية، حاول تاني');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      {user.role === 'partner' && <PartnerTabs />}
      <p className="text-xl font-bold">{dayLabel(today)}</p>
      <p className="text-mut text-[13px] my-1.5"></p>
      <div className="card">
        <input id="car" className="field" placeholder="نوع العربية (مثلاً: كورولا) *" autoComplete="off" value={car} onChange={(e) => setCar(e.target.value)} />
        <input className="field mt-2.5" placeholder="رقم اللوحة (مثلاً: أ ب ج 1234) *" autoComplete="off" maxLength={15}
          value={plate} onChange={(e) => setPlate(e.target.value)} />
        <input className="field mt-2.5" type="tel" inputMode="numeric" maxLength={11} placeholder="رقم تليفون العميل (01xxxxxxxxx) *" autoComplete="off"
          value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <p className="text-mut text-[13px] mt-3">اختار خدمة أو أكتر:</p>
        <ServicePicker sel={sel} prices={db.prices} services={db.services} onPick={pick} />
        {sel.includes('chem') && (
          <>
            <p className="text-mut text-[13px] mb-1.5">سعر الكيماوي الكامل حسب الحالة، عدّله لو مختلف:</p>
            <input className="field" type="number" inputMode="numeric" value={chemPrice === '' ? db.prices.chem : chemPrice} onChange={(e) => setChemPrice(e.target.value)} />
          </>
        )}
        <div className="flex justify-between items-center mt-3 mb-1 text-mut">
          <span>حساب العربية</span><strong className="text-brand2 text-[22px]">{num(sum)} ج.م</strong>
        </div>
        <button className="btn mt-1.5" disabled={!ready || busy} onClick={submit}>
          {busy ? 'جاري التسجيل...' : 'تسجيل العربية'}
        </button>
        <div className="text-ok text-sm min-h-5 mt-2 text-center">{toast}</div>
      </div>

      {last && (
        <div className="card mt-3">
          <div className="flex justify-between items-center">
            <span>فاتورة #{last.no} ({last.car} · {last.plate})</span>
            <strong className="text-brand2">{num(last.price)} ج.م</strong>
          </div>
          <div className="flex gap-2 mt-3">
            <a className="btn flex-1 text-center" href={`/invoice/${last.token}`} target="_blank" rel="noreferrer">عرض الفاتورة</a>
            <a className="btn flex-1 text-center" href={waLink(last.phone, last.token, last.price)} target="_blank" rel="noreferrer">إرسال واتساب</a>
          </div>
        </div>
      )}

      <h2 className="text-base text-mut font-semibold mt-6 mb-2.5">عربيات النهاردة ({num(list.length)})</h2>
      <div className="card">
        {list.length ? list.map((o) => (
          <div key={o.id} className="row">
            <div>
              {o.car}{o.plate ? ' · ' + o.plate : ''}<br />
              <small className="text-mut">{itemsName(o)}</small>
            </div>
            <div className="text-left">
              <small className="text-mut">{timeLabel(o.ts)}</small>
              {o.invoiceToken && (
                <>
                  <br />
                  <a className="text-brand2 text-sm" href={`/invoice/${o.invoiceToken}`} target="_blank" rel="noreferrer">فاتورة</a>
                </>
              )}
            </div>
          </div>
        )) : <div className="text-mut text-center py-4 text-sm">لسه مفيش عربيات النهاردة. سجّل أول عربية من فوق.</div>}
      </div>
    </main>
  );
}