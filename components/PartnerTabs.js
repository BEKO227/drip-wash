'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [['/worker', 'تسجيل'], ['/partners', 'النهاردة'], ['/partners/archive', 'الأرشيف'], ['/partners/reports', 'التقارير'], ['/partners/prices', 'الأسعار'], ['/partners/packages', 'الباقات']];
export default function PartnerTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1.5 mb-3 print:hidden">
      {TABS.map(([href, label]) => (
        <Link key={href} href={href} className={`flex-1 text-center text-xs sm:text-sm py-2.5 rounded-xl border bg-card ${path === href ? 'text-brand2 border-brand' : 'text-mut border-line'}`}>{label}</Link>
      ))}
    </div>
  );
}