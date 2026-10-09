'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { dayKey, num } from '@/lib/format';
import { addExpense, removeExpense, listenMonth, monthKey, dmy } from '@/lib/finance';

const inp = 'w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm';
const btn = 'rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-40';
const primary = 'rounded-xl bg-brand px-4 py-2 text-sm font-bold text-black disabled:opacity-50';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthKey());
  const [exp, setExp] = useState(null);
  const [adv, setAdv] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(dayKey());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExp(null); setAdv(null);
    const a = listenMonth('expenses', month, setExp);
    const b = listenMonth('advances', month, setAdv);
    return () => { a(); b(); };
  }, [month]);

  // البنود + سلف العمال في قايمة واحدة
  const rows = useMemo(() => {
    if (!exp || !adv) return [];
    return [
      ...exp.map((e) => ({ id: e.id, kind: 'exp', name: e.name, amount: Number(e.amount) || 0, day: e.day, ts: e.ts || 0 })),
      ...adv.map((a) => ({ id: a.id, kind: 'adv', name: `سلفة · ${a.staffName}${a.note ? ` (${a.note})` : ''}`, amount: Number(a.amount) || 0, day: a.day, ts: a.ts || 0 })),
    ].sort((x, y) => y.day.localeCompare(x.day) || y.ts - x.ts);
  }, [exp, adv]);

  if (!user || !exp || !adv) return <p className="py-6 text-center text-sm text-mut">جاري التحميل...</p>;

  const expTotal = rows.filter((r) => r.kind === 'exp').reduce((a, r) => a + r.amount, 0);
  const advTotal = rows.filter((r) => r.kind === 'adv').reduce((a, r) => a + r.amount, 0);

  const submit = async () => {
    const price = Number(amount);
    if (!name.trim()) return setErr('اكتب البند');
    if (!(price > 0)) return setErr('اكتب السعر اللي دفعته (أكبر من صفر)');
    if (!day) return setErr('اختار التاريخ');
    setBusy(true); setErr('');
    try { await addExpense(name, price, day, user); setName(''); setAmount(''); }
    catch (e) { console.error(e); setErr('فشل الحفظ، راجع الصلاحيات (Rules)'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!window.confirm(`تحذف بند "${r.name}"؟`)) return;
    try { await removeExpense(r.id); } catch (e) { console.error(e); alert('حصل خطأ. راجع الصلاحيات (Rules) وجرّب تاني'); }
  };

  const exportPdf = () => {
    const old = document.title;
    document.title = `Drip Wash expenses ${month}`;
    window.print();
    document.title = old;
  };

  return (
    <section>
      <div className="print:hidden">
        <div className="card space-y-2">
          <p className="font-bold">إضافة مصروف</p>
          <input className={inp} placeholder="البند (مثلاً: شامبو، كهرباء، إيجار)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} type="number" inputMode="decimal" placeholder="السعر اللي دفعته" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={inp} type="date" style={{ colorScheme: 'dark' }} value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button className={primary} disabled={busy} onClick={submit}>{busy ? 'جاري الحفظ...' : 'حفظ المصروف'}</button>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1 text-xs text-mut">الشهر
            <input className={`${inp} mt-1`} type="month" style={{ colorScheme: 'dark' }} value={month} onChange={(e) => setMonth(e.target.value || monthKey())} />
          </label>
          <button className={`${btn} py-2.5`} onClick={exportPdf}>طباعة / PDF</button>
        </div>
      </div>

      {/* التقرير */}
      <h2 className="mt-5 mb-2 text-base font-semibold">تقرير مصروفات شهر {month}</h2>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-line bg-card py-2"><div className="text-lg font-black">{num(expTotal)}</div><div className="text-mut">بنود</div></div>
        <div className="rounded-xl border border-line bg-card py-2"><div className="text-lg font-black">{num(advTotal)}</div><div className="text-mut">سلف العمال</div></div>
        <div className="rounded-xl border border-brand bg-card py-2"><div className="text-lg font-black text-brand2">{num(expTotal + advTotal)}</div><div className="text-mut">الإجمالي</div></div>
      </div>

      <div className="card mt-3">
        {rows.length === 0 ? <p className="py-4 text-center text-sm text-mut">مفيش مصروفات في الشهر ده</p> : rows.map((r) => (
          <div key={`${r.kind}-${r.id}`} className="row">
            <div>
              {r.name}
              {r.kind === 'adv' && <span className="mx-1.5 rounded border border-brand px-1.5 py-0.5 text-[11px] text-brand2">سلفة</span>}
              <br /><small className="text-mut">{dmy(r.day)}</small>
            </div>
            <div className="flex items-center gap-2">
              <b>{num(r.amount)} ج.م</b>
              {r.kind === 'exp' && <button className={`${btn} text-red-400 print:hidden`} onClick={() => remove(r)}>حذف</button>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-mut print:hidden">السلف بتتسجل من صفحة العمال وبتظهر هنا تلقائي.</p>
    </section>
  );
}
