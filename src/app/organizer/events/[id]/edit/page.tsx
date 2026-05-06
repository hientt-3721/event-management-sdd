import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getEventById } from '@/features/events/queries'
import { EditEventForm } from '@/components/organizer/edit-event-form'
import Link from 'next/link'

interface EditEventPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params
  const event = await getEventById(id)
  if (!event) notFound()

  const t = await getTranslations('organizer')

  if (event.status === 'cancelled') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-red-600">{t('status.cancelled')}</p>
        <Link href={`/organizer/events/${id}`} className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← {t('title')}
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/organizer/events/${id}`} className="text-sm text-indigo-600 hover:underline">
          ← {t('title')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('form.editEventTitle')}</h1>
      </div>
      <EditEventForm event={event} />
    </main>
  )
}
