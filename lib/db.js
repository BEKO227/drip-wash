'use client';
// طبقة الداتا الوحيدة: Firestore. الصفحات بتستخدم الدوال دي بس.
import { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { SERVICES } from './config';
import { dayKey } from './format';

const defaults = () => Object.fromEntries(SERVICES.map((s) => [s.k, s.p]));

// range = { from, to } بصيغة YYYY-MM-DD. من غيره بيرجّع الأسعار بس.
export function useDb(range) {
  const { user } = useAuth();
  const uid = user?.id, role = user?.role;
  const from = range?.from, to = range?.to;
  const [prices, setPrices] = useState(null);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'settings', 'prices'),
      (s) => setPrices({ ...defaults(), ...(s.data() || {}) }),
      (e) => console.error(e));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    if (!from) { setOrders([]); return; }
    const c = [where('day', '>=', from), where('day', '<=', to)];
    if (role === 'worker') c.push(where('by', '==', uid));
    return onSnapshot(query(collection(db, 'orders'), ...c),
      (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error(e));
  }, [uid, role, from, to]);

  if (!prices || !orders) return null;
  return { prices, orders };
}

export function useToday() {
  const [k, setK] = useState(dayKey());
  useEffect(() => {
    const t = setInterval(() => setK(dayKey()), 30000);
    return () => clearInterval(t);
  }, []);
  return k;
}

export function addOrder(car, items, user) {
  return addDoc(collection(db, 'orders'), {
    day: dayKey(), ts: Date.now(), car, items,
    price: items.reduce((a, i) => a + i.p, 0),
    by: user.id, byName: user.name, createdAt: serverTimestamp(),
  });
}
export function savePrices(prices) { return setDoc(doc(db, 'settings', 'prices'), prices, { merge: true }); }
export const ordersOf = (s, day) => s.orders.filter((o) => o.day === day).sort((a, b) => b.ts - a.ts);
