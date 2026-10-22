import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/TabBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Speak Easy',
  description: 'Your personal American English coach: shadowing, vocab, speaking and social skills.',
  appleWebApp: { capable: true, title: 'Speak Easy', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f4ef' },
    { media: '(prefers-color-scheme: dark)', color: '#121214' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <main className="mx-auto max-w-xl px-4 pb-6 pt-[max(16px,env(safe-area-inset-top))]">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
