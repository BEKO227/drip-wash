'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const homeFor = (u) => (u.role === 'partner' ? '/partners' : '/worker');

// اسم المستخدم بيتحوّل لإيميل داخلي: worker -> worker@dripwash.app
const toEmail = (username) => `${username.trim().toLowerCase()}@dripwash.app`;

let state = { ready: false, user: null };
const subs = new Set();
let started = false;
const publish = (s) => { state = s; subs.forEach((f) => f()); };

function start() {
  if (started) return;
  started = true;
  onAuthStateChanged(auth, async (fu) => {
    if (!fu) return publish({ ready: true, user: null });
    try {
      const d = (await getDoc(doc(db, 'users', fu.uid))).data();
      publish({ ready: true, user: d ? { id: fu.uid, name: d.name, role: d.role } : null });
    } catch (e) {
      console.error(e);
      publish({ ready: true, user: null });
    }
  });
}

// بيرجّع null لو نجح، أو رسالة الخطأ. اسم المستخدم (worker) بيتحوّل لإيميل داخلي، ولو كتب إيميل كامل بيتستخدم زي ما هو
export async function login(username, password) {
  const id = username.trim().toLowerCase();
  const email = id.includes('@') ? id : `${id}@dripwash.app`;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      return 'الحساب موجود لكن مفيش له document في collection users (راجع إن الـ Document ID هو الـ UID بالظبط)';
    }
    return null;
  } catch (e) {
    console.error(e);
    const c = e.code || '';
    // يغطي invalid-credential و invalid-login-credentials (الاسمين بيظهروا حسب نسخة Firebase)
    if (/invalid-(login-)?credentials?|wrong-password|user-not-found|invalid-email|missing-password/.test(c)) return 'اسم المستخدم أو كلمة السر غلط، راجعهم وجرّب تاني';
    if (/user-disabled/.test(c)) return 'الحساب ده موقوف، كلّم المسؤول';
    if (/too-many-requests/.test(c)) return 'محاولات كتير غلط، استنى شوية وجرّب تاني';
    if (/network/.test(c)) return 'مفيش اتصال بالإنترنت، اتأكد من الشبكة وجرّب تاني';
    if (/api-key/.test(c)) return 'مفتاح Firebase غلط. راجع .env.local وأعد تشغيل npm run dev';
    if (/permission-denied/.test(c)) return 'قواعد Firestore بتمنع قراءة بيانات المستخدم. راجع Rules واضغط Publish';
    if (/unauthorized-domain/.test(c)) return 'الدومين ده مش مضاف في Firebase (Authentication ← Settings ← Authorized domains)';
    return 'حصل خطأ غير متوقع، جرّب تاني. لو المشكلة مستمرة كلّم المسؤول';
  }
}
export const logout = () => signOut(auth);

export function useAuth() {
  const [s, setS] = useState(state);
  useEffect(() => {
    start();
    const f = () => setS(state);
    subs.add(f); f();
    return () => subs.delete(f);
  }, []);
  return s;
}