# Drip Wash

نظام إدارة مغسلة: Next.js (App Router) + Tailwind + Firebase (Auth + Firestore).

## تشغيل محلي
1. `npm install`
2. انسخ `.env.example` باسم `.env.local` واملأ قيم Firebase
3. `npm run dev` ثم افتح http://localhost:3000

## Firebase
- Authentication: Email/Password (اسم المستخدم + `@dripwash.app`)
- Firestore: collection `users` (document id = UID، حقول `name` و`role`: `worker` أو `partner`)
- القواعد في `firestore.rules` (تتنسخ في Firestore > Rules)

## النشر على Vercel
1. ارفع المشروع على GitHub
2. في Vercel: Add New > Project > اختار الريبو
3. Settings > Environment Variables: ضيف المتغيرات الستة من `.env.example`
4. Deploy
5. Firebase > Authentication > Settings > Authorized domains: ضيف دومين Vercel
