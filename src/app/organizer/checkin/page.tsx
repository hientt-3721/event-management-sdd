import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrganizerEvents } from '@/features/events/queries'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function CheckinIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role: string } | null)?.role

  let events
  if (role === 'staff') {
    // Staff sees all published events
    const { data } = await supabase
      .from('events')
      .select('id, name, location, start_at, status')
      .eq('status', 'published')
      .order('start_at', { ascending: true })
    events = data ?? []
  } else {
    // Organizer sees only their events (published)
    const all = await getOrganizerEvents(user.id)
    events = all.filter((e) => e.status === 'published')
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Check-in sự kiện</h1>
        <p className="mt-1 text-sm text-gray-500">Chọn sự kiện để bắt đầu quét QR check-in.</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400">
          Không có sự kiện nào đang mở.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/organizer/events/${event.id}/checkin`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-500">{event.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success">Đang mở</Badge>
                <span className="text-indigo-500">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
