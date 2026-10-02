'use client';
import { SERVICES } from '@/lib/config';
import { num } from '@/lib/format';

// قاعدة: بره + جوا = "بره وجوا" تلقائي، و"بره وجوا" مع بره أو جوا مرفوضة
export function nextSel(sel, k) {
  if (sel.includes(k)) return { sel: sel.filter((x) => x !== k) };
  if ((k === 'ext' || k === 'int') && sel.includes('both')) return { sel, msg: 'بره وجوا مختارة بالفعل' };
  const noWash = (a) => a.filter((x) => x !== 'ext' && x !== 'int');
  let n = [...sel, k];
  if (k === 'both') n = noWash(n);
  else if (n.includes('ext') && n.includes('int')) n = [...noWash(n), 'both'];
  return { sel: n };
}

// services = [{ k, n }] من useDb (الأساسية + اللي ضافها الشريك). من غيرها بتعرض الأساسية بس.
export default function ServicePicker({ sel, prices, onPick, services = SERVICES }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 my-3">
      {services.map((s, i) => {
        const on = sel.includes(s.k);
        const last = i === services.length - 1 && services.length % 2 === 1;
        return (
          <button key={s.k} aria-pressed={on} onClick={() => onPick(s.k)}
            className={`svc flex flex-col items-center gap-1 rounded-2xl border-[1.5px] px-2 py-4 ${last ? 'col-span-2' : ''} ${on ? 'border-brand bg-brand/15' : 'border-line bg-card2'}`}>
            <span className="text-[17px] font-bold">{on ? '✓ ' : ''}{s.n}</span>
            <em className={`not-italic text-sm ${on ? 'text-brand2' : 'text-mut'}`}>{num(prices[s.k] ?? 0)} ج.م{s.k === 'chem' ? ' وأكتر' : ''}</em>
          </button>
        );
      })}
    </div>
  );
}