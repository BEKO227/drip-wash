'use client';
// طبقة الداتا الوحيدة: Firestore. الصفحات بتستخدم الدوال دي بس.
import { useEffect, useState } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { SERVICES } from './config';
import { dayKey } from './format';

const defaults = () => Object.fromEntries(SERVICES.map((s) => [s.k, s.p]));

// range = { from, to } بصيغة YYYY-MM-DD. من غيره بيرجّع الأسعار والخدمات بس.
export function useDb(range) {
  const { user } = useAuth();
  const uid = user?.id, role = user?.role;
  const from = range?.from, to = range?.to;
  const [prices, setPrices] = useState(null);
  const [orders, setOrders] = useState(null);
  const [extra, setExtra] = useState(null); // الخدمات اللي ضافها الشريك

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'settings', 'prices'),
      (s) => setPrices({ ...defaults(), ...(s.data() || {}) }),
      (e) => console.error(e));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'settings', 'services'),
      (s) => setExtra(s.data()?.list || []),
      (e) => { console.error(e); setExtra([]); });
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

  if (!prices || !orders || !extra) return null;
  // كل الخدمات: الأساسية + المضافة. السعر دايماً من prices[k]
  const services = [...SERVICES.map(({ k, n }) => ({ k, n })), ...extra];
  return { prices, orders, services };
}

export function useToday() {
  const [k, setK] = useState(dayKey());
  useEffect(() => {
    const t = setInterval(() => setK(dayKey()), 30000);
    return () => clearInterval(t);
  }, []);
  return k;
}

// items = [{ k, n, p }]  (n = اسم الخدمة وقت التسجيل)
// بيحفظ الأوردر + نسخة الفاتورة العامة في نفس العملية، وبيرجّع { id, token, no, price }
export async function addOrder(car, items, user, phone, plate) {
  const token = crypto.randomUUID();
  const orderRef = doc(collection(db, 'orders'));
  const no = orderRef.id.slice(0, 6).toUpperCase();
  const day = dayKey();
  const ts = Date.now();
  const price = items.reduce((a, i) => a + i.p, 0);

  const batch = writeBatch(db);
  batch.set(orderRef, {
    day, ts, car, plate, items, price, phone, no,
    invoiceToken: token,
    by: user.id, byName: user.name, createdAt: serverTimestamp(),
  });
  // الفاتورة العامة من غير رقم التليفون
  batch.set(doc(db, 'invoices', token), { day, ts, car, plate, items, price, no, byName: user.name });
  await batch.commit();
  return { id: orderRef.id, token, no, price };
}

export function savePrices(prices) { return setDoc(doc(db, 'settings', 'prices'), prices, { merge: true }); }

// للشريك: إضافة خدمة جديدة بسعرها
export async function addService(name, price) {
  const k = 'c' + Date.now().toString(36);
  await setDoc(doc(db, 'settings', 'prices'), { [k]: Number(price) }, { merge: true });
  await setDoc(doc(db, 'settings', 'services'), { list: arrayUnion({ k, n: name.trim() }) }, { merge: true });
  return k;
}

export const ordersOf = (s, day) => s.orders.filter((o) => o.day === day).sort((a, b) => b.ts - a.ts);