'use client';

import dynamic from 'next/dynamic';

// Dynamically import heavy components
const ThemeProvider = dynamic(
  () => import('../contexts/ThemeContext').then(mod => ({ default: mod.ThemeProvider })),
  { ssr: true }
);

const NotificationProvider = dynamic(
  () => import('../contexts/NotificationContext').then(mod => ({ default: mod.NotificationProvider })),
  { ssr: true }
);

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </ThemeProvider>
  );
}