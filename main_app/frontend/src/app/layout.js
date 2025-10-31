import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  title: {
    default: 'Placement Management System',
    template: '%s | Placement Management System',
  },
  description: 'Comprehensive placement management system for students and administrators',
  keywords: ['placement', 'jobs', 'students', 'recruitment', 'campus'],
  authors: [{ name: 'Placement Team' }],
  creator: 'Placement Team',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#071025' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}