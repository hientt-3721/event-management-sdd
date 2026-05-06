import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteNav />
          <div className="min-h-screen">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
