import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SATQuery AI — See Earth Differently',
  description: 'An interactive vision-language assistant for multimodal remote sensing image analysis.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
