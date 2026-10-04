import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { dayKey } from './format';

export const DAY = 86400000;
export const PERIOD_DAYS = 30;

// عرض كيماوي الموتور (بيظهر في فواتير الباقات اللي 6 غسلات أو أكتر)
export const ENGINE_OFFER = { price: 100, was: 150, minWashes: 6 };

// أنواع الغسلات: كاملة = داخلي وخارجي، VIP = بأدق التفاصيل، خارجي = المجانية
export const TYPE_LABEL = { full: 'كاملة', vip: 'VIP', ext: 'خارجي' };
export const TYPE_NOTE = { full: 'داخلي وخارجي', vip: 'بأدق التفاصيل', ext: 'خارجي فقط' };
export const washName = (t) => `غسلة ${TYPE_LABEL[t] || t}`;
export const mainTypeOf = (p) => (p.vip ? 'vip' : 'full');

// الأسعار حسب الفلاير
export const DEFAULT_PLANS = [
  { name: 'Drip Express', car: 'sedan', price: 500, mainWashes: 4, freeWashes: 2, vip: false },
  { name: 'Drip Go', car: 'sedan', price: 800, mainWashes: 6, freeWashes: 3, vip: false },
  { name: 'Drip Silver VIP', car: 'sedan', price: 1000, mainWashes: 4, freeWashes: 2, vip: true },
  { name: 'Drip Gold VIP', car: 'sedan', price: 1500, mainWashes: 6, freeWashes: 3, vip: true },
  { name: 'Drip Prime', car: 'suv', price: 700, mainWashes: 4, freeWashes: 2, vip: false },
  { name: 'Drip Plus', car: 'suv', price: 1000, mainWashes: 6, freeWashes: 3, vip: false },
  { name: 'Drip Pro VIP', car: 'suv', price: 1300, mainWashes: 4, freeWashes: 2, vip: true },
  { name: 'Drip Ultimate VIP', car: 'suv', price: 2000, mainWashes: 6, freeWashes: 3, vip: true },
].map((p, i) => ({ ...p, order: i }));

export const total = (p) => Number(p.mainWashes) + Number(p.freeWashes);

// اشتراك جديد بيحتوي أرصدة منفصلة لكل نوع. القديم (قبل التقسيم) مفيهوش mainTotal
export const hasBuckets = (s) => s.mainTotal != null;
export const buckets = (s) =>
  [
    { kind: 'main', type: s.mainType, total: Number(s.mainTotal) || 0, used: Number(s.mainUsed) || 0 },
    { kind: 'free', type: 'ext', total: Number(s.freeTotal) || 0, used: Number(s.freeUsed) || 0 },
  ].filter((b) => b.total > 0);

// حالة الاشتراك: بتتحسب كل مرة من البيانات، مفيش حاجة متخزنة
export function statusOf(s, now = Date.now()) {
  if (s.cancelled) return { key: 'cancelled', label: 'ملغي', cls: 'text-mut' };
  if (s.used >= s.totalWashes) return { key: 'done', label: 'خلصت الغسلات', cls: 'text-red-400' };
  if (now > s.endDate) return { key: 'expired', label: 'منتهي', cls: 'text-red-400' };
  const days = Math.ceil((s.endDate - now) / DAY);
  if (days <= 5 || s.totalWashes - s.used <= 1) return { key: 'soon', label: 'قارب على الانتهاء', cls: 'text-yellow-400' };
  return { key: 'active', label: 'نشط', cls: 'text-green-400' };
}

const col = (n) => collection(db, n);
const ref = (n, id) => doc(db, n, id);

export function listen(name, cb) {
  return onSnapshot(
    col(name),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => { console.error(e); cb([]); }
  );
}

// الباقات
export const addPlan = (p) => addDoc(col('plans'), p);
export const savePlan = (id, p) => updateDoc(ref('plans', id), p);
export const removePlan = (id) => deleteDoc(ref('plans', id));
export async function seedPlans() {
  const b = writeBatch(db);
  DEFAULT_PLANS.forEach((p) => b.set(doc(col('plans')), p));
  await b.commit();
}

// لقطة بيانات الاشتراك اللي بتتخزن جوه الفاتورة العامة (من غير التليفون)
const snapshotOf = (id, s, extra) => ({
  subId: id, planName: s.planName, car: s.car, customerName: s.customerName, carModel: s.carModel || '',
  startDate: s.startDate, endDate: s.endDate,
  mainType: s.mainType, mainTotal: s.mainTotal, mainUsed: s.mainUsed, freeTotal: s.freeTotal, freeUsed: s.freeUsed,
  ...extra,
});

// اشتراك جديد + فاتورة الاشتراك في نفس العملية. user = { id, name }
export async function addSub(plan, f, user) {
  const sRef = doc(col('subscriptions'));
  const token = crypto.randomUUID();
  const now = Date.now();
  const main = Number(plan.mainWashes), free = Number(plan.freeWashes), price = Number(plan.price);
  const s = {
    customerName: f.name, phone: f.phone, plate: f.plate, carModel: f.carModel,
    planId: plan.id, planName: plan.name, car: plan.car, price,
    totalWashes: main + free, used: 0,
    mainType: mainTypeOf(plan), mainTotal: main, mainUsed: 0, freeTotal: free, freeUsed: 0,
    startDate: f.start, endDate: f.start + PERIOD_DAYS * DAY,
    cancelled: false, lastWashAt: null, invoiceToken: token, createdBy: user.id, createdAt: now,
  };
  const sub = snapshotOf(sRef.id, s, { kind: 'start' });
  const no = sRef.id.slice(0, 6).toUpperCase();
  const batch = writeBatch(db);
  batch.set(sRef, s);
  batch.set(doc(db, 'invoices', token), {
    day: dayKey(), ts: now, car: f.carModel, plate: f.plate,
    items: [{ k: 'plan', n: plan.name, p: price }], price, no, byName: user.name, sub,
  });
  await batch.commit();
  return { token, no, price, car: f.carModel, plate: f.plate, phone: f.phone, sub };
}

export const saveSub = (id, f) => updateDoc(ref('subscriptions', id), { customerName: f.name, phone: f.phone, plate: f.plate, carModel: f.carModel });
export const renewSub = (id) => {
  const now = Date.now();
  return updateDoc(ref('subscriptions', id), { used: 0, mainUsed: 0, freeUsed: 0, startDate: now, endDate: now + PERIOD_DAYS * DAY, cancelled: false, lastWashAt: null });
};
export const setCancelled = (id, v) => updateDoc(ref('subscriptions', id), { cancelled: v });
export const removeSub = (id) => deleteDoc(ref('subscriptions', id));

// تسجيل غسلة من الاشتراك. kind = 'main' (كاملة أو VIP) أو 'free' (الخارجي المجاني)
// في معاملة واحدة: خصم الرصيد + أوردر بسعر 0 (بيظهر في عربيات النهاردة) + فاتورة. يا كله يتنفذ يا ولا حاجة
export function recordSubWash(subId, kind, user) {
  const sRef = ref('subscriptions', subId);
  const oRef = doc(col('orders'));
  const token = crypto.randomUUID();
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sRef);
    if (!snap.exists()) throw new Error('الاشتراك مش موجود');
    const s = snap.data();
    const now = Date.now();
    if (!hasBuckets(s)) throw new Error('اشتراك قديم، لازم الإدارة تحذفه وتسجله من جديد');
    if (!['active', 'soon'].includes(statusOf(s, now).key)) throw new Error('الاشتراك منتهي أو ملغي');
    const k = kind === 'free' ? 'free' : 'main';
    const type = k === 'free' ? 'ext' : s.mainType;
    const usedNow = Number(s[k + 'Used']) || 0, tot = Number(s[k + 'Total']) || 0;
    if (usedNow >= tot) throw new Error(`رصيد ${washName(type)} خلص`);

    const after = { ...s, used: s.used + 1, [k + 'Used']: usedNow + 1 };
    const sub = snapshotOf(subId, after, { kind: 'wash', washKind: k, washType: type, washNo: usedNow + 1, washOf: tot });
    const no = oRef.id.slice(0, 6).toUpperCase();
    const car = s.carModel || s.plate;
    const day = dayKey();
    // الملحوظة اللي بتوضح إنها من الباقة موجودة في اسم الخدمة نفسه
    const items = [{ k: 'sub-' + type, n: `${washName(type)} · من باقة ${s.planName} (${usedNow + 1}/${tot})`, p: 0 }];

    tx.update(sRef, { used: after.used, [k + 'Used']: usedNow + 1, lastWashAt: now });
    tx.set(oRef, {
      day, ts: now, car, plate: s.plate, items, price: 0, phone: s.phone, no,
      invoiceToken: token, subId, subName: s.planName, subNote: `${washName(type)} ${usedNow + 1} من ${tot}`,
      by: user.id, byName: user.name, createdAt: serverTimestamp(),
    });
    tx.set(doc(db, 'invoices', token), { day, ts: now, car, plate: s.plate, items, price: 0, no, byName: user.name, sub });
    return { id: oRef.id, token, no, price: 0, car, plate: s.plate, phone: s.phone, sub };
  });
}

/* ---------- رسائل الواتساب ---------- */
export const invoiceUrl = (token) => `${window.location.origin}/invoice/${token}`;
export const waUrl = (phone, text) => `https://wa.me/20${phone.slice(1)}?text=${encodeURIComponent(text)}`;
export const dateAr = (ms) => new Date(ms).toLocaleDateString('en-GB');
const leftLine = (s) => buckets(s).map((b) => `${TYPE_LABEL[b.type]}: ${b.total - b.used}`).join(' | ');

export const washMsg = (r) =>
  `شكراً لزيارتكم Drip Wash 🚗✨\n` +
  `🔖 غسلة من باقة اشتراك: ${r.sub.planName}\n` +
  `${washName(r.sub.washType)} رقم ${r.sub.washNo} من ${r.sub.washOf}\n` +
  `المتبقي في باقتك: ${leftLine(r.sub)}\n` +
  `ينتهي الاشتراك: ${dateAr(r.sub.endDate)}\n` +
  `تقدر تشوف الفاتورة من هنا:\n${invoiceUrl(r.token)}`;

export const startMsg = (r) =>
  `أهلاً بيك في Drip Wash 🚗✨\n` +
  `تم تفعيل اشتراكك في باقة ${r.sub.planName} (${r.price} جنيه)\n` +
  `غسلات الباقة: ${buckets(r.sub).map((b) => `${TYPE_LABEL[b.type]} ${b.total}`).join(' | ')}\n` +
  `من ${dateAr(r.sub.startDate)} إلى ${dateAr(r.sub.endDate)}\n` +
  `فاتورة الاشتراك:\n${invoiceUrl(r.token)}`;