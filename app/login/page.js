'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, login, homeFor } from '@/lib/auth';

export default function LoginPage() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { if (ready && user) router.replace(homeFor(user)); }, [ready, user, router]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const msg = await login(u, p);
    if (msg) setErr(msg);
    };

  return (
    <main className="mt-6">
      <form onSubmit={submit} className="card space-y-3">
        <h1 className="text-xl font-bold">تسجيل الدخول</h1>
        <input className="field" dir="ltr" placeholder="اسم المستخدم" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
        <input className="field" dir="ltr" type="password" placeholder="كلمة السر" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
        <div className="text-red-400 text-sm min-h-5">{err}</div>
        <button className="btn" disabled={!u || !p}>دخول</button>
      </form>
    </main>
  );
}
