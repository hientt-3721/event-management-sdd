import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getOrganizerEvents } from '@/features/events/queries'
import { OrganizerEventList } from '@/components/organizer/organizer-event-list'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OrganizerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const events = await getOrganizerEvents(user.id)
  const t = await getTranslations('organizer')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-gray-500">{t('subtitle')}</p>
        </div>
        <Link
          href="/organizer/events/new"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + {t('createEvent')}
        </Link>
      </div>
      <OrganizerEventList events={events} />
    </main>
  )
}
