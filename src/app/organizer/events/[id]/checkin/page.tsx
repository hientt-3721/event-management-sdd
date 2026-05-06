import { getTranslations } from 'next-intl/server'
import { CheckInScanner } from '@/components/checkin/check-in-scanner'

interface CheckInPageProps {
  params: Promise<{ id: string }>
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  await params
  const t = await getTranslations('checkin')

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {t('subtitle')}
      </p>
      <CheckInScanner />
    </main>
  )
}
