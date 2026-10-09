'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { dayKey, num } from '@/lib/format';
import { listen } from '@/lib/subs';
import {
  DEFAULT_DAYS, monthKey, dmy, listenMonth, listenWorkdays,
  addStaff, saveStaff, removeStaff, saveDays, addAdvance, removeAdvance, addTip, removeTip,
} from '@/lib/finance';

const inp = 'w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm';
const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-40';
const primary = 'rounded-xl bg-brand px-4 py-2 text-sm font-bold text-black disabled:opacity-50';
const fail = (e) => { console.error(e); alert('حصل خطأ. راجع الصلاحيات (Rules) وجرّب تاني'); };

function StaffCard({ s, month, days, advs, user }) {
  const [wage, setWage] = useState(String(s.dailyWage));
  const [d, setD] = useState(String(days));
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [advDay, setAdvDay] = useState(month === monthKey() ? dayKey() : `${month}-01`);
  const [err, setErr] = useState('');

  useEffect(() => setWage(String(s.dailyWage)), [s.dailyWage]);
  useEffect(() => setD(String(days)), [days]);
  useEffect(() => setAdvDay(month === monthKey() ? dayKey() : `${month}-01`), [month]);

  const gross = (Number(s.dailyWage) || 0) * days;            // المرتب = اليومية × أيام الشغل
  const advTotal = advs.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const rest = gross - advTotal;                               // الباقي = المرتب - السلف

  const wageChanged = Number(wage) !== Number(s.dailyWage);
  const daysChanged = Number(d) !== days;

  const saveW = async () => {
    if (!(Number(wage) > 0)) return setErr('اليومية لازم تكون أكبر من صفر');
    setErr('');
    try { await saveStaff(s.id, { dailyWage: Number(wage) }); } catch (e) { fail(e); }
  };
  const saveD = async () => {
    const n = Number(d);
    if (!Number.isInteger(n) || n < 0 || n > 31) return setErr('أيام الشغل من 0 لـ 31');
    setErr('');
    try { await saveDays(s.id, month, n); } catch (e) { fail(e); }
  };
  const giveAdvance = async () => {
    const n = Number(amt);
    if (!(n > 0)) return setErr('اكتب مبلغ السلفة');
    if (!advDay || advDay.slice(0, 7) !== month) return setErr('تاريخ السلفة لازم يكون في الشهر المعروض');
    setErr('');
    try { await addAdvance(s, n, note, advDay, user); setAmt(''); setNote(''); } catch (e) { fail(e); }
  };
  const delAdvance = async (a) => {
    if (!window.confirm(`تحذف سلفة ${num(a.amount)} ج.م؟`)) return;
    try { await removeAdvance(a.id); } catch (e) { fail(e); }
  };
  const delStaff = async () => {
    if (!window.confirm(`تحذف ${s.name}؟ سلفه القديمة هتفضل في تقرير المصروفات.`)) return;
    try { await removeStaff(s.id); } catch (e) { fail(e); }
  };

  return (
    <li className="rounded-2xl border border-line bg-card p-3">
      <div className="flex items-center justify-between">
        <b>{s.name}</b>
        <button className={`${btn} text-red-400`} onClick={delStaff}>حذف</button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-mut">اليومية (جنيه)
          <div className="mt-1 flex gap-1">
            <input className={inp} type="number" inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} />
            {wageChanged && <button className={btn} onClick={saveW}>حفظ</button>}
          </div>
        </label>
        <label className="text-xs text-mut">أيام الشغل في الشهر
          <div className="mt-1 flex gap-1">
            <input className={inp} type="number" inputMode="numeric" value={d} onChange={(e) => setD(e.target.value)} />
            {daysChanged && <button className={btn} onClick={saveD}>حفظ</button>}
          </div>
        </label>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-mut">المرتب ({num(s.dailyWage)} × {num(days)} يوم)</span><b>{num(gross)} ج.م</b></div>
        <div className="flex justify-between"><span className="text-mut">السلف</span><b className="text-yellow-400">- {num(advTotal)} ج.م</b></div>
        <div className="flex justify-between border-t border-line pt-1">
          <span className="font-semibold">{rest < 0 ? 'عليه زيادة' : 'الباقي له'}</span>
          <b className={`text-lg ${rest < 0 ? 'text-red-400' : 'text-brand2'}`}>{num(Math.abs(rest))} ج.م</b>
        </div>
      </div>

      {advs.length > 0 && (
        <ul className="mt-2 border-t border-line pt-2 text-xs">
          {advs.sort((a, b) => b.day.localeCompare(a.day) || (b.ts || 0) - (a.ts || 0)).map((a) => (
            <li key={a.id} className="flex items-center justify-between py-1">
              <span>{dmy(a.day)}{a.note ? ` · ${a.note}` : ''}</span>
              <span className="flex items-center gap-2"><b>{num(a.amount)} ج.م</b><button className={`${btn} text-red-400`} onClick={() => delAdvance(a)}>حذف</button></span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 space-y-2 border-t border-line pt-2">
        <p className="text-xs text-mut">تسجيل سلفة</p>
        <div className="grid grid-cols-2 gap-2">
          <input className={inp} type="number" inputMode="decimal" placeholder="المبلغ" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <input className={inp} type="date" style={{ colorScheme: 'dark' }} value={advDay} onChange={(e) => setAdvDay(e.target.value)} />
        </div>
        <input className={inp} placeholder="ملحوظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button className={btn} onClick={giveAdvance}>+ إضافة السلفة</button>
      </div>
    </li>
  );
}

const defDay = (m) => (m === monthKey() ? dayKey() : `${m}-01`);

/* ---------- تاب التبس ---------- */
function TipsCard({ s, month, tips, user }) {
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(defDay(month));
  const [err, setErr] = useState('');
  useEffect(() => setDay(defDay(month)), [month]);

  const total = tips.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const sorted = [...tips].sort((a, b) => b.day.localeCompare(a.day) || (b.ts || 0) - (a.ts || 0));

  const add = async () => {
    const n = Number(amt);
    if (!(n > 0)) return setErr('اكتب مبلغ التبس');
    if (!day || day.slice(0, 7) !== month) return setErr('التاريخ لازم يكون في الشهر المعروض');
    setErr('');
    try { await addTip(s, n, note, day, user); setAmt(''); setNote(''); } catch (e) { fail(e); }
  };
  const del = async (t) => {
    if (!window.confirm(`تحذف تبس ${num(t.amount)} ج.م؟`)) return;
    try { await removeTip(t.id); } catch (e) { fail(e); }
  };

  return (
    <li className="rounded-2xl border border-line bg-card p-3">
      <div className="flex items-center justify-between">
        <b>{s.name}</b>
        <span className="text-sm text-mut">التبس: <b className="text-lg text-brand2">{num(total)} ج.م</b></span>
      </div>

      {sorted.length > 0 && (
        <ul className="mt-2 border-t border-line pt-2 text-xs">
          {sorted.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-1">
              <span>{dmy(t.day)}{t.note ? ` · ${t.note}` : ''}</span>
              <span className="flex items-center gap-2"><b>{num(t.amount)} ج.م</b><button className={`${btn} text-red-400`} onClick={() => del(t)}>حذف</button></span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 space-y-2 border-t border-line pt-2">
        <p className="text-xs text-mut">تسجيل تبس</p>
        <div className="grid grid-cols-2 gap-2">
          <input className={inp} type="number" inputMode="decimal" placeholder="المبلغ" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <input className={inp} type="date" style={{ colorScheme: 'dark' }} value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <input className={inp} placeholder="ملحوظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button className={btn} onClick={add}>+ إضافة التبس</button>
      </div>
    </li>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pay'); // pay = المرتبات والسلف، tips = التبس
  const [month, setMonth] = useState(monthKey());
  const [staff, setStaff] = useState(null);
  const [workdays, setWorkdays] = useState(null);
  const [advances, setAdvances] = useState(null);
  const [tips, setTips] = useState(null);
  const [name, setName] = useState('');
  const [wage, setWage] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => listen('staff', setStaff), []);
  useEffect(() => {
    setWorkdays(null); setAdvances(null); setTips(null);
    const a = listenWorkdays(month, setWorkdays);
    const b = listenMonth('advances', month, setAdvances);
    const c = listenMonth('tips', month, setTips);
    return () => { a(); b(); c(); };
  }, [month]);

  if (!user || !staff || !workdays || !advances || !tips) return <p className="py-6 text-center text-sm text-mut">جاري التحميل...</p>;

  const daysOf = (id) => workdays.find((w) => w.staffId === id)?.days ?? DEFAULT_DAYS;
  const advsOf = (id) => advances.filter((a) => a.staffId === id);
  const tipsOf = (id) => tips.filter((t) => t.staffId === id);
  const list = [...staff].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const sumGross = list.reduce((a, s) => a + (Number(s.dailyWage) || 0) * daysOf(s.id), 0);
  const sumAdv = list.reduce((a, s) => a + advsOf(s.id).reduce((x, y) => x + (Number(y.amount) || 0), 0), 0);
  const sumTips = tips.reduce((a, t) => a + (Number(t.amount) || 0), 0);

  const add = async () => {
    if (!name.trim()) return setErr('اكتب اسم العامل');
    if (!(Number(wage) > 0)) return setErr('اكتب اليومية');
    setErr('');
    try { await addStaff(name, wage); setName(''); setWage(''); } catch (e) { console.error(e); setErr('فشل الحفظ، راجع الصلاحيات (Rules)'); }
  };

  return (
    <section>
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-2">
        {[['pay', 'المرتبات والسلف'], ['tips', 'التبس']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-xl border py-2 font-bold ${tab === k ? 'border-brand bg-brand text-black' : 'border-line bg-card text-mut'}`}>{l}</button>
        ))}
      </div>

      <label className="block text-xs text-mut">الشهر
        <input className={`${inp} mt-1`} type="month" style={{ colorScheme: 'dark' }} value={month} onChange={(e) => setMonth(e.target.value || monthKey())} />
      </label>

      {tab === 'pay' ? (
        <>
          <div className="card mt-4 space-y-2">
            <p className="font-bold">إضافة عامل</p>
            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="اسم العامل" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={inp} type="number" inputMode="decimal" placeholder="اليومية (جنيه)" value={wage} onChange={(e) => setWage(e.target.value)} />
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button className={primary} onClick={add}>إضافة</button>
          </div>

          {list.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-line bg-card py-2"><div className="text-lg font-black">{num(sumGross)}</div><div className="text-mut">إجمالي المرتبات</div></div>
              <div className="rounded-xl border border-line bg-card py-2"><div className="text-lg font-black text-yellow-400">{num(sumAdv)}</div><div className="text-mut">السلف</div></div>
              <div className="rounded-xl border border-brand bg-card py-2"><div className="text-lg font-black text-brand2">{num(sumGross - sumAdv)}</div><div className="text-mut">الباقي</div></div>
            </div>
          )}

          {list.length === 0 ? <p className="py-6 text-center text-sm text-mut">مفيش عمال لسه. أضف أول عامل من فوق.</p> : (
            <ul className="mt-3 space-y-3">
              {list.map((s) => <StaffCard key={s.id} s={s} month={month} days={daysOf(s.id)} advs={advsOf(s.id)} user={user} />)}
            </ul>
          )}
        </>
      ) : (
        <>
          {list.length > 0 && (
            <div className="mt-3 rounded-xl border border-brand bg-card py-2 text-center text-xs">
              <div className="text-lg font-black text-brand2">{num(sumTips)} ج.م</div><div className="text-mut">إجمالي التبس في الشهر</div>
            </div>
          )}
          {list.length === 0 ? <p className="py-6 text-center text-sm text-mut">أضف العمال الأول من تاب "المرتبات والسلف".</p> : (
            <ul className="mt-3 space-y-3">
              {list.map((s) => <TipsCard key={s.id} s={s} month={month} tips={tipsOf(s.id)} user={user} />)}
            </ul>
          )}
          <p className="mt-2 text-xs text-mut">التبس منفصلة: مش بتتحسب في المصروفات ولا في المرتب.</p>
        </>
      )}
    </section>
  );
}