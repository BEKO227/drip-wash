'use client';
// المصروفات + العمال (اليومية والسلف). كله للشريك بس.
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { dayKey } from './format';

export const DEFAULT_DAYS = 30; // عدد أيام الشغل الافتراضي في الشهر
export const monthKey = (d = dayKey()) => d.slice(0, 7); // YYYY-MM
export const dmy = (k) => k.split('-').reverse().join('/'); // YYYY-MM-DD -> DD/MM/YYYY

const mapDocs = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));

// بيسمع لوثائق شهر معين (بالحقل day)
export function listenMonth(name, month, cb) {
  const q = query(collection(db, name), where('day', '>=', `${month}-01`), where('day', '<=', `${month}-31`));
  return onSnapshot(q, (s) => cb(mapDocs(s)), (e) => { console.error(e); cb([]); });
}

/* ---------- المصروفات ---------- */
export const addExpense = (name, amount, day, user) =>
  addDoc(collection(db, 'expenses'), { name: name.trim(), amount: Number(amount), day, ts: Date.now(), by: user.id, byName: user.name });
export const removeExpense = (id) => deleteDoc(doc(db, 'expenses', id));

/* ---------- العمال ---------- */
export const addStaff = (name, dailyWage) =>
  addDoc(collection(db, 'staff'), { name: name.trim(), dailyWage: Number(dailyWage), createdAt: Date.now() });
export const saveStaff = (id, data) => setDoc(doc(db, 'staff', id), data, { merge: true });
export const removeStaff = (id) => deleteDoc(doc(db, 'staff', id));

// أيام شغل العامل في شهر معين: وثيقة واحدة لكل (عامل + شهر)
export const saveDays = (staffId, month, days) =>
  setDoc(doc(db, 'workdays', `${staffId}_${month}`), { staffId, month, days: Number(days) });
export function listenWorkdays(month, cb) {
  return onSnapshot(query(collection(db, 'workdays'), where('month', '==', month)),
    (s) => cb(mapDocs(s)), (e) => { console.error(e); cb([]); });
}

// السلف: بتتخصم من مرتب الشهر وبتظهر تلقائي في تقرير المصروفات
export const addAdvance = (s, amount, note, day, user) =>
  addDoc(collection(db, 'advances'), { staffId: s.id, staffName: s.name, amount: Number(amount), note: note.trim(), day, ts: Date.now(), by: user.id });
export const removeAdvance = (id) => deleteDoc(doc(db, 'advances', id));

/* ---------- التبس: بتتجمع من العامل وبتتسلّم له آخر الشهر (مش مصروف ومش جزء من المرتب) ---------- */
export const addTip = (s, amount, note, day, user) =>
  addDoc(collection(db, 'tips'), { staffId: s.id, staffName: s.name, amount: Number(amount), note: note.trim(), day, ts: Date.now(), by: user.id });
export const removeTip = (id) => deleteDoc(doc(db, 'tips', id));