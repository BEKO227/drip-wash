'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useDb } from '@/lib/db';
import { listen } from '@/lib/subs';
import { TZ } from '@/lib/config';
import { dayKey, num, itemsName } from '@/lib/format';
import { DEFAULT_DAYS, monthKey, dmy, listenMonth, listenWorkdays } from '@/lib/finance';

const inp = 'w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm';
const ORANGE = '#e86f00';
const SOFT = '#fff4e8';
const evDay = (ts) => dayKey(new Date(ts));
const sum = (list, f) => list.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const monthLabel = (m) => new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, month: 'long', year: 'numeric' }).format(new Date(`${m}-15T12:00:00Z`));
const money = (n) => `${n < 0 ? '- ' : ''}${num(Math.abs(n))} ج.م`;

/* ---------- عناصر التقرير (ورقة بيضاء: بتظهر على الشاشة وبتتطبع زي ما هي) ---------- */
const th = 'border-b-2 border-black/30 px-1.5 py-1.5 text-start text-[11px] font-bold text-black/60';
const td = 'border-b border-black/10 px-1.5 py-1.5 align-top text-[12px] leading-snug';

function Title({ children }) {
  return <h3 className="mb-1.5 mt-5 border-r-4 pr-2 text-sm font-extrabold" style={{ borderColor: ORANGE, breakAfter: 'avoid' }}>{children}</h3>;
}
function Empty() { return <p className="py-2 text-xs text-black/50">لا يوجد</p>; }

// head = عناوين الأعمدة، rows = [{ cells: [...], bold }]
function Table({ head, rows }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full border-collapse">
        <thead><tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.bold ? 'font-bold' : ''} style={{ breakInside: 'avoid', ...(r.bold ? { backgroundColor: SOFT } : null) }}>
              {r.cells.map((c, j) => <td key={j} className={`${td} ${j === r.cells.length - 1 ? 'whitespace-nowrap' : ''}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Line({ label, hint, value, bold, color }) {
  return (
    <div className={`flex items-start justify-between gap-3 border-b border-black/10 py-2 ${bold ? 'font-extrabold' : ''}`} style={{ breakInside: 'avoid', ...(bold ? { backgroundColor: SOFT } : null) }}>
      <div className="px-1">{label}{hint && <div className="text-[11px] font-normal text-black/50">{hint}</div>}</div>
      <span className="whitespace-nowrap px-1" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function Report({ d, view }) {
  const [noLogo, setNoLogo] = useState(false);
  const detailed = view === 'detail';
  const issued = new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, dateStyle: 'long' }).format(new Date());

  return (
    <article dir="rtl" className="overflow-hidden rounded-2xl bg-white text-black shadow-lg print:rounded-none print:shadow-none">
      <div className="flex items-center justify-between gap-3 bg-black px-5 py-4">
        {noLogo
          ? <b className="text-2xl text-white">Drip Wash</b>
          // eslint-disable-next-line @next/next/no-img-element
          : <img src="/logo.png" alt="Drip Wash" className="h-12 w-auto" onError={() => setNoLogo(true)} />}
        <div className="text-end text-white">
          <div className="text-base font-extrabold">التقرير المالي {detailed ? 'المفصّل' : 'المختصر'}</div>
          <div className="text-xs" style={{ color: '#ff8a1f' }}>{monthLabel(d.month)}</div>
        </div>
      </div>
      <div className="h-1.5" style={{ backgroundColor: '#ff8a1f' }} />

      <div className="px-5 pb-6 pt-4">
        {/* صافي الشهر */}
        <div className="rounded-xl px-4 py-3 text-center" style={{ border: `2px solid ${d.net < 0 ? '#dc2626' : '#ff8a1f'}`, backgroundColor: SOFT, breakInside: 'avoid' }}>
          <div className="text-xs text-black/60">صافي الشهر</div>
          <div className="text-3xl font-black" style={{ color: d.net < 0 ? '#dc2626' : ORANGE }}>{money(d.net)}</div>
        </div>

        <Title>الإيرادات</Title>
        <Line label="العربيات" hint={`${num(d.paid.length)} عربية مدفوعة (بعد الخصم)`} value={money(d.carsRev)} />
        <Line label="الاشتراكات" hint={`${num(d.newSubs)} جديد · ${num(d.renewSubs)} تجديد`} value={money(d.subRev)} />
        <Line bold label="إجمالي الإيرادات" value={money(d.revenue)} />

        <Title>المصروفات</Title>
        <Line label="بنود المصروفات" hint={`${num(d.exp.length)} بند`} value={money(d.itemsTotal)} />
        <Line label="مرتبات العمال" hint={`منها سلف اتدفعت ${money(d.advTotal)}، والباقي ${money(d.salaries - d.advTotal)}`} value={money(d.salaries)} />
        <Line bold label="إجمالي المصروفات" value={money(d.costs)} />

        <Title>تبس العمال</Title>
        <Line label="إجمالي التبس" hint="بتتجمع وتتسلّم للعمال، مش داخلة في الإيرادات ولا المصروفات" value={money(d.tipsTotal)} />

        {detailed && (
          <>
            <Title>تفاصيل إيرادات العربيات</Title>
            <Table
              head={['التاريخ', 'العربية', 'الخدمات', 'الخصم', 'المبلغ']}
              rows={[
                ...d.paid.map((o) => ({
                  cells: [
                    dmy(o.day),
                    <>{o.car}{o.plate ? <div className="text-black/50">{o.plate}</div> : null}</>,
                    itemsName(o),
                    o.discountPct > 0 ? <>{num(o.discountPct)}%<div className="text-black/50">قبل {num(o.subtotal)}</div></> : '—',
                    num(o.price),
                  ],
                })),
                ...(d.paid.length ? [{ bold: true, cells: ['الإجمالي', '', '', '', num(d.carsRev)] }] : []),
              ]}
            />
            {d.packWashes > 0 && <p className="mt-1 text-[11px] text-black/50">غير محسوب هنا: {num(d.packWashes)} غسلة من الباقات (مدفوعة وقت الاشتراك).</p>}

            <Title>تفاصيل الاشتراكات</Title>
            <Table
              head={['التاريخ', 'العميل', 'الباقة', 'النوع', 'المبلغ']}
              rows={[
                ...d.subList.map((e) => ({
                  cells: [dmy(evDay(e.ts)), e.s.customerName, <span dir="ltr">{e.s.planName}</span>, e.renew ? 'تجديد' : 'اشتراك جديد', num(e.price)],
                })),
                ...(d.subList.length ? [{ bold: true, cells: ['الإجمالي', '', '', '', num(d.subRev)] }] : []),
              ]}
            />

            <Title>تفاصيل بنود المصروفات</Title>
            <Table
              head={['التاريخ', 'البند', 'المبلغ']}
              rows={[
                ...d.expList.map((e) => ({ cells: [dmy(e.day), e.name, num(e.amount)] })),
                ...(d.expList.length ? [{ bold: true, cells: ['الإجمالي', '', num(d.itemsTotal)] }] : []),
              ]}
            />

            <Title>مرتبات العمال</Title>
            <Table
              head={['العامل', 'اليومية', 'الأيام', 'المرتب', 'السلف', 'الباقي']}
              rows={[
                ...d.staffRows.map((r) => ({ cells: [r.s.name, num(r.s.dailyWage), num(r.days), num(r.gross), num(r.advSum), money(r.rest)] })),
                ...(d.staffRows.length ? [{ bold: true, cells: ['الإجمالي', '', '', num(d.salaries), num(d.advTotal), money(d.salaries - d.advTotal)] }] : []),
              ]}
            />

            <Title>تفاصيل السلف</Title>
            <Table
              head={['التاريخ', 'العامل', 'ملحوظة', 'المبلغ']}
              rows={[
                ...d.advList.map((a) => ({ cells: [dmy(a.day), a.staffName, a.note || '—', num(a.amount)] })),
                ...(d.advList.length ? [{ bold: true, cells: ['الإجمالي', '', '', num(d.advTotal)] }] : []),
              ]}
            />

            <Title>التبس لكل عامل</Title>
            <Table
              head={['العامل', 'عدد المرات', 'الإجمالي']}
              rows={[
                ...d.tipsByStaff.map((t) => ({ cells: [t.name, num(t.count), num(t.total)] })),
                ...(d.tipsByStaff.length ? [{ bold: true, cells: ['الإجمالي', num(d.tipList.length), num(d.tipsTotal)] }] : []),
              ]}
            />
            {d.tipList.length > 0 && (
              <div className="mt-3">
                <Table
                  head={['التاريخ', 'العامل', 'ملحوظة', 'المبلغ']}
                  rows={d.tipList.map((t) => ({ cells: [dmy(t.day), t.staffName, t.note || '—', num(t.amount)] }))}
                />
              </div>
            )}
          </>
        )}

        <p className="mt-6 text-center text-[11px] text-black/50">
          المرتبات = يومية كل عامل × أيام الشغل المسجلة للشهر (30 يوم لو متسجلش غير كده) · تاريخ الإصدار {issued}
        </p>
        <p className="mt-1 text-center text-[11px] text-black/40">Drip Wash</p>
      </div>
    </article>
  );
}

export default function SummaryPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthKey());
  const [view, setView] = useState('summary'); // summary = مختصر، detail = مفصّل
  const from = `${month}-01`, to = `${month}-31`;
  const db = useDb({ from, to });
  const [subs, setSubs] = useState(null);
  const [staff, setStaff] = useState(null);
  const [workdays, setWorkdays] = useState(null);
  const [exp, setExp] = useState(null);
  const [adv, setAdv] = useState(null);
  const [tips, setTips] = useState(null);

  useEffect(() => {
    const a = listen('subscriptions', setSubs);
    const b = listen('staff', setStaff);
    return () => { a(); b(); };
  }, []);
  useEffect(() => {
    setWorkdays(null); setExp(null); setAdv(null); setTips(null);
    const a = listenWorkdays(month, setWorkdays);
    const b = listenMonth('expenses', month, setExp);
    const c = listenMonth('advances', month, setAdv);
    const t = listenMonth('tips', month, setTips);
    return () => { a(); b(); c(); t(); };
  }, [month]);

  if (!user || !db || !subs || !staff || !workdays || !exp || !adv || !tips) return <p className="py-6 text-center text-sm text-mut">جاري التحميل...</p>;

  const byDay = (a, b) => a.day.localeCompare(b.day) || (a.ts || 0) - (b.ts || 0);

  // الإيرادات
  const orders = db.orders.filter((o) => o.day >= from && o.day <= to);
  const paid = orders.filter((o) => (Number(o.price) || 0) > 0).sort(byDay);
  const carsRev = sum(paid, (o) => o.price);
  const subList = subs
    .flatMap((s) => [
      { ts: s.createdAt, price: s.price, renew: false, s },
      ...(s.renewals || []).map((r) => ({ ts: r.ts, price: r.price, renew: true, s })),
    ])
    .filter((e) => e.ts && evDay(e.ts) >= from && evDay(e.ts) <= to)
    .sort((a, b) => a.ts - b.ts);
  const subRev = sum(subList, (e) => e.price);
  const revenue = carsRev + subRev;

  // المصروفات
  const expList = [...exp].sort(byDay);
  const advList = [...adv].sort(byDay);
  const tipList = [...tips].sort(byDay);
  const itemsTotal = sum(exp, (e) => e.amount);
  const advTotal = sum(adv, (a) => a.amount);
  const tipsTotal = sum(tips, (t) => t.amount);
  const staffRows = [...staff].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((s) => {
    const days = workdays.find((w) => w.staffId === s.id)?.days ?? DEFAULT_DAYS;
    const gross = (Number(s.dailyWage) || 0) * days;
    const advSum = sum(adv.filter((a) => a.staffId === s.id), (a) => a.amount);
    return { s, days, gross, advSum, rest: gross - advSum };
  });
  const salaries = sum(staffRows, (r) => r.gross);
  const costs = itemsTotal + salaries; // السلف جزء من المرتب، فمش بتتحسب مرتين
  const tipsByStaff = Object.values(tips.reduce((m, t) => {
    const k = t.staffId || t.staffName;
    m[k] = m[k] || { name: t.staffName, count: 0, total: 0 };
    m[k].count += 1; m[k].total += Number(t.amount) || 0;
    return m;
  }, {}));

  const d = {
    month, paid, carsRev, subList, subRev, revenue, exp, expList, advList, tipList, itemsTotal, advTotal, tipsTotal,
    staffRows, salaries, costs, net: revenue - costs, tipsByStaff,
    packWashes: orders.filter((o) => o.subId).length,
    newSubs: subList.filter((e) => !e.renew).length,
    renewSubs: subList.filter((e) => e.renew).length,
  };

  const exportPdf = () => {
    const old = document.title;
    document.title = `Drip Wash ${view === 'detail' ? 'detailed' : 'summary'} ${month}`;
    window.print();
    document.title = old;
  };

  return (
    <section>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="print:hidden">
        <label className="block text-xs text-mut">الشهر
          <input className={`${inp} mt-1`} type="month" style={{ colorScheme: 'dark' }} value={month} onChange={(e) => setMonth(e.target.value || monthKey())} />
        </label>
        <div role="tablist" className="mt-3 grid grid-cols-2 gap-2">
          {[['summary', 'ملخص'], ['detail', 'مفصّل']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
              className={`rounded-xl border py-2 font-bold ${view === k ? 'border-brand bg-brand text-black' : 'border-line bg-card text-mut'}`}>{l}</button>
          ))}
        </div>
        <button className="mb-3 mt-2 w-full rounded-xl border border-line bg-card py-2.5 text-sm font-semibold" onClick={exportPdf}>
          طباعة / حفظ PDF ({view === 'detail' ? 'مفصّل' : 'ملخص'})
        </button>
      </div>

      <Report d={d} view={view} />
    </section>
  );
}