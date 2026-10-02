import './globals.css';
import Header from '@/components/Header';

export const metadata = { title: 'Drip Wash', description: 'إدارة مغسلة Drip Wash' ,  icons: {
  icon: "/favico.png",
  apple: "/favico.png",
},};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans">
        <div className="max-w-[720px] mx-auto p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
