import { getTranslations } from 'next-intl/server'
import { getPublishedEvents } from '@/features/events/queries'
import { EventList } from '@/components/events/event-list'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const events = await getPublishedEvents()
  const t = await getTranslations('events')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-500">{t('subtitle')}</p>
      </div>
      <EventList events={events} />
    </main>
  )
}
