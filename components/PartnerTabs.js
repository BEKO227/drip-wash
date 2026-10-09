'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// صفين من غير scroll: الصف الأول 5 تابات، والتاني 4 بياخدوا العرض كله
const TABS = [
  ['/worker', 'تسجيل'], ['/partners', 'النهاردة'], ['/partners/archive', 'الأرشيف'], ['/partners/reports', 'التقارير'], ['/partners/summary', 'الملخص'],
  ['/partners/expenses', 'المصروفات'], ['/partners/staff', 'العمال'], ['/partners/packages', 'الباقات'], ['/partners/prices', 'الأسعار'],
];

export default function PartnerTabs() {
  const path = usePathname();
  return (
    <nav className="mb-3 flex flex-wrap gap-1.5 print:hidden">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? 'page' : undefined}
          style={{ flex: '1 1 calc(20% - 6px)' }}
          className={`flex min-h-[40px] items-center justify-center whitespace-nowrap rounded-xl border px-1 text-center text-[11px] font-semibold leading-tight sm:text-sm ${path === href ? 'border-brand bg-card text-brand2' : 'border-line bg-card text-mut'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}