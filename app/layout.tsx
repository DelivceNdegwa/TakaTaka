import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Instrument_Sans } from 'next/font/google';
import './globals.css';

const display = Big_Shoulders({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-display' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Taka Green: Tupa taka mahali pake',
  description: 'Waste in the right place becomes something worth having. See how Nairobi’s waste gets a second life, and what happens when it ends up in the river.',
};
export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
