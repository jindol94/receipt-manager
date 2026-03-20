import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: '영수증 관리',
  description: '법인카드 영수증 관리 및 증빙 시스템',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <main className="app-container">
          <AuthProvider>{children}</AuthProvider>
        </main>
      </body>
    </html>
  );
}
