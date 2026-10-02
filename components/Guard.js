'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, homeFor } from '@/lib/auth';

// بيسمح بس لدور واحد؛ أي حد تاني بيتحوّل لصفحته أو لصفحة الدخول
export default function Guard({ role, children }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const allowed = [].concat(role); // دور واحد أو أكتر
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (!allowed.includes(user.role)) router.replace(homeFor(user));
  }, [ready, user, allowed, router]);
  if (!ready || !user || !allowed.includes(user.role)) return null;
  return children;
}
