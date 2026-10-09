'use client';
// طبقة الداتا الوحيدة: Firestore. الصفحات بتستخدم الدوال دي بس.
import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, collection, deleteField, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
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
  const [extra, setExtra] = useState(null); // { list: الخدمات المضافة, hidden: الأساسية اللي الشريك مسحها }

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'settings', 'prices'),
      (s) => setPrices({ ...defaults(), ...(s.data() || {}) }),
      (e) => console.error(e));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'settings', 'services'),
      (s) => setExtra({ list: s.data()?.list || [], hidden: s.data()?.hidden || [] }),
      (e) => { console.error(e); setExtra({ list: [], hidden: [] }); });
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
  // كل الخدمات: الأساسية + المضافة، من غير اللي الشريك مسحها. السعر دايماً من prices[k]
  const services = [...SERVICES.map(({ k, n }) => ({ k, n })), ...extra.list]
    .filter((s) => !extra.hidden.includes(s.k));
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
export async function addOrder(car, items, user, phone, plate, discountPct = 0) {
  const token = crypto.randomUUID();
  const orderRef = doc(collection(db, 'orders'));
  const no = orderRef.id.slice(0, 6).toUpperCase();
  const day = dayKey();
  const ts = Date.now();
  const subtotal = items.reduce((a, i) => a + i.p, 0);
  // الخصم: نسبة من 0 لـ 99. price = السعر النهائي بعد الخصم (هو اللي بيتحسب في التقارير)
  const pct = Math.min(99, Math.max(0, Number(discountPct) || 0));
  const price = pct > 0 ? Math.max(1, Math.round(subtotal * (1 - pct / 100))) : subtotal;
  const disc = pct > 0 ? { subtotal, discountPct: pct, discountAmount: subtotal - price } : {};

  const batch = writeBatch(db);
  batch.set(orderRef, {
    day, ts, car, plate, items, price, ...disc, phone, no,
    invoiceToken: token,
    by: user.id, byName: user.name, createdAt: serverTimestamp(),
  });
  // الفاتورة العامة من غير رقم التليفون
  batch.set(doc(db, 'invoices', token), { day, ts, car, plate, items, price, ...disc, no, byName: user.name });
  await batch.commit();
  return { id: orderRef.id, token, no, price, ...disc };
}

// للشريك: تعديل بيانات عربية. o = الأوردر الحالي، f = { car, plate, phone, price }
// بيحدّث الأوردر ونسخة الفاتورة العامة (من غير التليفون) في نفس العملية
export async function updateOrder(o, f) {
  const car = (f.car ?? o.car ?? '').trim();
  const plate = (f.plate ?? o.plate ?? '').trim();
  const phone = (f.phone ?? o.phone ?? '').trim();
  const price = Number(f.price ?? o.price) || 0;

  // لو السعر اتغيّر يدويًا بيانات الخصم القديمة (قبل/نسبة) تتشال عشان الفاتورة متتناقضش
  const clear = o.discountPct && price !== Number(o.price)
    ? { subtotal: deleteField(), discountPct: deleteField(), discountAmount: deleteField() } : {};

  const batch = writeBatch(db);
  batch.set(doc(db, 'orders', o.id), { car, plate, phone, price, ...clear }, { merge: true });
  if (o.invoiceToken) {
    batch.set(doc(db, 'invoices', o.invoiceToken), { car, plate, price, ...clear }, { merge: true });
  }
  await batch.commit();
}

// للشريك: مسح أوردر وفاتورته العامة (لينك الفاتورة هيبطل يشتغل)
export async function deleteOrder(o) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'orders', o.id));
  if (o.invoiceToken) batch.delete(doc(db, 'invoices', o.invoiceToken));
  await batch.commit();
}

export function savePrices(prices) { return setDoc(doc(db, 'settings', 'prices'), prices, { merge: true }); }

// للشريك: إضافة خدمة جديدة بسعرها
export async function addService(name, price) {
  const k = 'c' + Date.now().toString(36);
  await setDoc(doc(db, 'settings', 'prices'), { [k]: Number(price) }, { merge: true });
  await setDoc(doc(db, 'settings', 'services'), { list: arrayUnion({ k, n: name.trim() }) }, { merge: true });
  return k;
}

// للشريك: مسح أي خدمة (s = { k, n } من db.services)، أساسية أو مضافة.
// المضافة بتتشال من القايمة، والأساسية بتتخفي (hidden) لأنها جاية من config.
// الأوردرات القديمة بتفضل محتفظة باسم وسعر الخدمة لأنها مخزنة جواها.
export async function deleteService(s) {
  const batch = writeBatch(db);
  const ref = doc(db, 'settings', 'services');
  if (SERVICES.some((b) => b.k === s.k)) {
    batch.set(ref, { hidden: arrayUnion(s.k) }, { merge: true });
  } else {
    batch.set(ref, { list: arrayRemove({ k: s.k, n: s.n }) }, { merge: true });
  }
  batch.set(doc(db, 'settings', 'prices'), { [s.k]: deleteField() }, { merge: true });
  await batch.commit();
}

export const ordersOf = (s, day) => s.orders.filter((o) => o.day === day).sort((a, b) => b.ts - a.ts);