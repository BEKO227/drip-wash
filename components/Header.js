'use client';
import Logo from './Logo';
import { useAuth, logout } from '@/lib/auth';

export default function Header() {
  const { user } = useAuth();
  return (
    <header className="flex items-center justify-between gap-3 mb-4 print:hidden">
      <Logo />
      {user && (
        <div className="text-end text-sm">
          <div className="font-semibold">{user.name}</div>
          <div className="text-mut text-xs">
            <button onClick={logout} className="underline">تسجيل خروج</button>
          </div>
        </div>
      )}
    </header>
  );
}
