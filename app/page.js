'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, homeFor } from '@/lib/auth';

export default function Home() {
  const { ready, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? homeFor(user) : '/login');
  }, [ready, user, router]);
  return null;
}
