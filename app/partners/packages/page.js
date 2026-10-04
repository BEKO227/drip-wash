'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import PartnerTabs from '@/components/PartnerTabs';
import Packages from '@/components/Packages';

export default function PackagesPage() {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) return null;

  return (
    <>
      <Packages />
    </>
  );
}