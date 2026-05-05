import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SiteNav } from '@/components/layout/site-nav'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'EventApp',
  description: 'Register for events, get digital QR tickets, and check in quickly.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans antialiased">
        <SiteNav />
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  )
}
