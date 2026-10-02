import { TZ, SERVICES } from './config';

export const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
export const dayLabel = (k) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(k + 'T12:00:00Z'));
export const timeLabel = (ts) =>
  new Intl.DateTimeFormat('ar-EG', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
export const num = (n) => Number(n).toLocaleString('ar-EG');
export const svName = (k) => SERVICES.find((s) => s.k === k)?.n ?? k;
// الاسم متخزن في الأوردر (i.n) للخدمات الجديدة، والأوردرات القديمة بتقرا من SERVICES
export const itemsName = (o) => o.items.map((i) => i.n ?? svName(i.k)).join(' + ');
export const total = (list) => list.reduce((a, o) => a + o.price, 0);