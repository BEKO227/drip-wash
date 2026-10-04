'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  DAY, total, statusOf, listen, seedPlans, addPlan, savePlan, removePlan,
  addSub, saveSub, renewSub, setCancelled, removeSub, recordSubWash,
  buckets, hasBuckets, washName, mainTypeOf, waUrl, washMsg, startMsg, dateAr,
} from '@/lib/subs';

const inp = 'w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm';
const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-40';
const primary = 'rounded-xl bg-brand px-4 py-2 text-sm font-bold text-black disabled:opacity-50';
const carName = (c) => (c === 'suv' ? 'SUV' : 'سيدان');
const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

async function run(fn, confirmMsg) {
  if (confirmMsg && !window.confirm(confirmMsg)) return;
  try { await fn(); } catch (e) { console.error(e); alert('حصل خطأ. راجع الصلاحيات (Rules) وجرّب تاني'); }
}

function Field({ label, children }) {
  return <label className="block text-xs text-mut">{label}<div className="mt-1 text-white">{children}</div></label>;
}

/* ---------- الباقات ---------- */
function PlanForm({ initial, onClose }) {
  const [f, setF] = useState(initial || { name: '', car: 'sedan', price: '', mainWashes: '', freeWashes: '', vip: false });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async () => {
    const price = Number(f.price), main = Number(f.mainWashes), free = Number(f.freeWashes);
    if (!f.name.trim() || !(price > 0) || !(main >= 0) || !(free >= 0) || main + free < 1) return setErr('كمّل البيانات صح (اسم، سعر، وعدد غسلات)');
    const data = { name: f.name.trim(), car: f.car, price, mainWashes: main, freeWashes: free, vip: !!f.vip, order: f.order ?? Date.now() };
    try { initial?.id ? await savePlan(initial.id, data) : await addPlan(data); onClose(); }
    catch (e) { console.error(e); setErr('فشل الحفظ، راجع الصلاحيات'); }
  };

  return (
    <div className="mb-3 space-y-2 rounded-2xl border border-brand bg-card p-3">
      <Field label="اسم الباقة"><input className={inp} value={f.name} onChange={set('name')} dir="ltr" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="نوع العربية">
          <select className={inp} value={f.car} onChange={set('car')}><option value="sedan" className="text-black">سيدان</option><option value="suv" className="text-black">SUV / كروس أوفر</option></select>
        </Field>
        <Field label="السعر (جنيه)"><input type="number" className={inp} value={f.price} onChange={set('price')} /></Field>
        <Field label={f.vip ? 'غسلات VIP' : 'غسلات كاملة (داخلي وخارجي)'}><input type="number" className={inp} value={f.mainWashes} onChange={set('mainWashes')} /></Field>
        <Field label="غسلات مجانية (خارجي)"><input type="number" className={inp} value={f.freeWashes} onChange={set('freeWashes')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.vip} onChange={set('vip')} /> باقة VIP (الغسلات الأساسية تبقى VIP بدل كاملة)</label>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2"><button className={primary} onClick={submit}>حفظ</button><button className={btn} onClick={() => onClose()}>إلغاء</button></div>
    </div>
  );
}

function PlansTab({ plans, isPartner }) {
  const [form, setForm] = useState(null);
  const sorted = [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div>
      {isPartner && !form && (
        <div className="mb-3 flex gap-2">
          <button className={primary} onClick={() => setForm({})}>+ باقة جديدة</button>
          {plans.length === 0 && <button className={btn} onClick={() => run(seedPlans, 'تضيف الـ 8 باقات الافتراضية؟')}>إضافة الباقات الافتراضية</button>}
        </div>
      )}
      {form && <PlanForm key={form.id || 'new'} initial={form.id ? form : null} onClose={() => setForm(null)} />}
      {['sedan', 'suv'].map((car) => {
        const list = sorted.filter((p) => p.car === car);
        if (!list.length) return null;
        return (
          <div key={car} className="mb-4">
            <h3 className="mb-2 border-r-4 border-brand pr-2 font-bold">{carName(car)}</h3>
            <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {list.map((p) => (
                <li key={p.id} className={`rounded-2xl border bg-card p-3 ${p.vip ? 'border-brand' : 'border-line'}`}>
                  <div dir="ltr" className="text-right font-extrabold text-brand2">{p.name}</div>
                  <div className="mt-1 text-sm">{p.mainWashes} {washName(mainTypeOf(p))}</div>
                  <div className="text-sm">+ {p.freeWashes} {washName('ext')} مجاناً</div>
                  <div className="text-xs text-mut">إجمالي {total(p)} غسلات</div>
                  <div className="mt-2 text-lg font-black">{Number(p.price).toLocaleString('en-US')} جنيه</div>
                  {isPartner && (
                    <div className="mt-2 flex gap-2">
                      <button className={btn} onClick={() => { setForm(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>تعديل</button>
                      <button className={`${btn} text-red-400`} onClick={() => run(() => removePlan(p.id), `تحذف باقة ${p.name}؟ المشتركين الحاليين مش هيتأثروا.`)}>حذف</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- المشتركين ---------- */
function SubForm({ plans, initial, user, onClose }) {
  const sortedPlans = [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [f, setF] = useState({
    name: initial?.customerName || '', phone: initial?.phone || '', plate: initial?.plate || '', carModel: initial?.carModel || '',
    planId: sortedPlans[0]?.id || '', start: toInput(Date.now()),
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const data = { name: f.name.trim(), phone: f.phone.trim(), plate: f.plate.trim(), carModel: f.carModel.trim(), start: new Date(f.start + 'T00:00:00').getTime(), planId: f.planId };
    if (!data.name) return setErr('اكتب اسم العميل');
    if (!/^01[0125][0-9]{8}$/.test(data.phone)) return setErr('رقم التليفون لازم يبقى 11 رقم ويبدأ بـ 01');
    if (!data.plate || data.plate.length > 20) return setErr('اكتب رقم العربية');
    if (!data.carModel || data.carModel.length > 60) return setErr('اكتب نوع العربية (مثلاً: تويوتا كورولا 2020)');
    setBusy(true);
    try {
      if (initial) { await saveSub(initial.id, data); onClose(); }
      else {
        const plan = plans.find((p) => p.id === data.planId);
        if (!plan) { setBusy(false); return setErr('اختار باقة'); }
        onClose(await addSub(plan, data, user)); // بيرجّع الفاتورة عشان تظهر بعد التسجيل
      }
    } catch (e) { console.error(e); setErr('فشل الحفظ، راجع الصلاحيات'); setBusy(false); }
  };

  return (
    <div className="mb-3 space-y-2 rounded-2xl border border-brand bg-card p-3">
      <Field label="اسم العميل"><input className={inp} value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="التليفون"><input className={inp} dir="ltr" inputMode="numeric" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="رقم العربية"><input className={inp} value={f.plate} onChange={set('plate')} /></Field>
      </div>
      <Field label="نوع العربية (الماركة والموديل)"><input className={inp} value={f.carModel} onChange={set('carModel')} placeholder="مثلاً: تويوتا كورولا 2020" /></Field>
      {!initial && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="الباقة">
            <select className={inp} value={f.planId} onChange={set('planId')}>
              {sortedPlans.map((p) => <option key={p.id} value={p.id} className="text-black">{p.name} ({carName(p.car)}) - {p.price}</option>)}
            </select>
          </Field>
          <Field label="تاريخ البداية"><input type="date" className={inp} value={f.start} onChange={set('start')} /></Field>
        </div>
      )}
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2"><button className={primary} disabled={busy} onClick={submit}>{initial ? 'حفظ التعديل' : 'تسجيل الاشتراك'}</button><button className={btn} onClick={() => onClose()}>إلغاء</button></div>
    </div>
  );
}

// بعد تسجيل اشتراك جديد أو غسلة: عرض الفاتورة + واتساب
function Notice({ r, onClose }) {
  const isWash = r.sub.kind === 'wash';
  return (
    <div className="mb-3 rounded-2xl border border-brand bg-card p-3">
      <div className="text-sm font-bold">{isWash ? `🔖 اتسجلت غسلة من الباقة (${r.sub.planName})` : `تم تسجيل الاشتراك في ${r.sub.planName}`}</div>
      {isWash && <div className="mt-1 text-xs text-mut">{washName(r.sub.washType)} {r.sub.washNo} من {r.sub.washOf} · {r.car} · {r.plate}</div>}
      <div className="mt-2 flex flex-wrap gap-2">
        <a className={btn} href={`/invoice/${r.token}`} target="_blank" rel="noreferrer">عرض الفاتورة</a>
        <a className={btn} href={waUrl(r.phone, isWash ? washMsg(r) : startMsg(r))} target="_blank" rel="noreferrer">إرسال واتساب</a>
        <button className={btn} onClick={onClose}>إغلاق</button>
      </div>
    </div>
  );
}

function SubCard({ s, isPartner, user, onEdit, onWash }) {
  const st = statusOf(s);
  const days = Math.ceil((s.endDate - Date.now()) / DAY);
  const canWash = hasBuckets(s) && (st.key === 'active' || st.key === 'soon');

  const wash = async (b) => {
    if (!window.confirm(`تسجل ${washName(b.type)} لـ ${s.customerName}؟`)) return;
    try { onWash(await recordSubWash(s.id, b.kind, user)); }
    catch (e) { console.error(e); alert(e?.code ? 'حصل خطأ. راجع الصلاحيات (Rules) وجرّب تاني' : e.message); }
  };

  return (
    <li className="rounded-2xl border border-line bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{s.customerName}</div>
          <a href={`tel:${s.phone}`} dir="ltr" className="text-xs text-mut underline">{s.phone}</a>
          <span className="mx-2 text-xs text-mut">|</span>
          <span className="text-xs">{s.plate}</span>
          {s.carModel && <div className="text-xs text-mut">{s.carModel}</div>}
        </div>
        <span className={`shrink-0 text-xs font-bold ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-2 text-sm"><span dir="ltr" className="font-semibold text-brand2">{s.planName}</span> <span className="text-xs text-mut">({carName(s.car)} - {Number(s.price).toLocaleString('en-US')} جنيه)</span></div>

      {hasBuckets(s) ? buckets(s).map((b) => (
        <div key={b.kind} className="mt-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold">{washName(b.type)}</span>
            <span className="text-mut">اتستخدم {b.used} من {b.total} (متبقي {b.total - b.used})</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand" style={{ width: `${Math.min(100, (b.used / b.total) * 100)}%` }} /></div>
        </div>
      )) : <p className="mt-2 text-xs text-yellow-400">اشتراك قديم (قبل تقسيم الغسلات حسب النوع). احذفه وسجّله من جديد.</p>}

      <div className="mt-2 text-xs text-mut">ينتهي {dateAr(s.endDate)}{days >= 0 && !s.cancelled ? ` (بعد ${days} يوم)` : ''}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {hasBuckets(s) && buckets(s).map((b) => (
          <button key={b.kind} className={`${btn} border-brand`} disabled={!canWash || b.used >= b.total} onClick={() => wash(b)}>سجّل {washName(b.type)}</button>
        ))}
        {isPartner && (
          <>
            <button className={btn} disabled={!hasBuckets(s)} onClick={() => run(() => renewSub(s.id), 'تجدد الاشتراك 30 يوم وتصفّر كل الغسلات؟')}>تجديد</button>
            <button className={btn} onClick={onEdit}>تعديل</button>
            <button className={btn} onClick={() => run(() => setCancelled(s.id, !s.cancelled), s.cancelled ? null : 'تلغي الاشتراك؟')}>{s.cancelled ? 'تفعيل' : 'إلغاء'}</button>
            <button className={`${btn} text-red-400`} onClick={() => run(() => removeSub(s.id), 'تحذف الاشتراك نهائي؟')}>حذف</button>
          </>
        )}
      </div>
    </li>
  );
}

const FILTERS = [['all', 'الكل'], ['active', 'نشط'], ['soon', 'قارب'], ['ended', 'منتهي'], ['cancelled', 'ملغي']];

function SubsTab({ subs, plans, user, isPartner }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);

  const withSt = useMemo(() => subs.map((s) => ({ s, k: statusOf(s).key })), [subs]);
  const group = (k) => (k === 'done' || k === 'expired' ? 'ended' : k);
  const counts = useMemo(() => withSt.reduce((a, { k }) => ({ ...a, [group(k)]: (a[group(k)] || 0) + 1 }), {}), [withSt]);
  const list = withSt
    .filter(({ s, k }) => (filter === 'all' || group(k) === filter)
      && (!q.trim() || `${s.customerName} ${s.phone} ${s.plate} ${s.carModel || ''}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => a.s.endDate - b.s.endDate);

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
        {[['active', 'نشط', 'text-green-400'], ['soon', 'قارب', 'text-yellow-400'], ['ended', 'منتهي', 'text-red-400'], ['all', 'الكل', '']].map(([k, l, c]) => (
          <div key={k} className="rounded-xl border border-line bg-card py-2">
            <div className={`text-lg font-black ${c}`}>{k === 'all' ? subs.length : counts[k] || 0}</div><div className="text-mut">{l}</div>
          </div>
        ))}
      </div>
      {notice && <Notice r={notice} onClose={() => setNotice(null)} />}
      {isPartner && !form && <button className={`${primary} mb-3`} onClick={() => setForm({})}>+ اشتراك جديد</button>}
      {form && <SubForm key={form.id || 'new'} plans={plans} initial={form.id ? form : null} user={user} onClose={(r) => { setForm(null); if (r) setNotice(r); }} />}
      <input className={`${inp} mb-2`} placeholder="ابحث بالاسم أو التليفون أو رقم أو نوع العربية" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${filter === k ? 'border-brand text-brand2' : 'border-line text-mut'}`}>{l}</button>
        ))}
      </div>
      {list.length === 0 ? <p className="py-6 text-center text-sm text-mut">مفيش اشتراكات</p> : (
        <ul className="space-y-2">{list.map(({ s }) => <SubCard key={s.id} s={s} isPartner={isPartner} user={user} onWash={(r) => { setNotice(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onEdit={() => { setForm(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}</ul>
      )}
    </div>
  );
}

/* ---------- الصفحة ---------- */
export default function Packages() {
  const { user } = useAuth();
  const isPartner = user?.role === 'partner';
  const [tab, setTab] = useState('subs');
  const [plans, setPlans] = useState(null);
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    const a = listen('plans', setPlans);
    const b = listen('subscriptions', setSubs);
    return () => { a(); b(); };
  }, []);

  if (!user || !plans || !subs) return <p className="py-6 text-center text-sm text-mut">جاري التحميل...</p>;

  return (
    <section>
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-2">
        {[['subs', 'المشتركين'], ['plans', 'الباقات']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-xl border py-2 font-bold ${tab === k ? 'border-brand bg-brand text-black' : 'border-line bg-card text-mut'}`}>{l}</button>
        ))}
      </div>
      {tab === 'subs' ? <SubsTab subs={subs} plans={plans} user={user} isPartner={isPartner} /> : <PlansTab plans={plans} isPartner={isPartner} />}
    </section>
  );
}