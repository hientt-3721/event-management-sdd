import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEventById } from '@/features/events/queries'
import { Badge } from '@/components/ui/badge'
import { OrganizerEventActions } from '@/components/organizer/organizer-event-actions'
import { AddTicketTypeForm } from '@/components/organizer/add-ticket-type-form'
import Link from 'next/link'

interface OrganizerEventDetailProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function OrganizerEventDetailPage({ params }: OrganizerEventDetailProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const event = await getEventById(id)
  if (!event) notFound()

  // Staff can view any event; organizer only their own
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const prof = profile as { role: string } | null
  if (prof?.role === 'organizer' && event.organizer_id !== user.id) {
    redirect('/organizer')
  }

  // Attendee count
  const { count: attendeeCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .in('ticket_type_id', event.ticket_types.map((tt) => tt.id))
    .eq('status', 'active')

  const statusMap: Record<string, string> = {
    draft: 'Nháp',
    published: 'Đang mở',
    cancelled: 'Đã huỷ',
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={event.status === 'published' ? 'success' : event.status === 'cancelled' ? 'error' : 'default'}>
              {statusMap[event.status]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        </div>
        {prof?.role === 'organizer' && (
          <div className="flex items-center gap-2">
            {event.status !== 'cancelled' && (
              <Link
                href={`/organizer/events/${event.id}/edit`}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ✏️ Sửa
              </Link>
            )}
            <OrganizerEventActions event={event} />
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
        <p>📅 {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.start_at))}</p>
        <p>📍 {event.location}</p>
        <p>👥 {attendeeCount ?? 0} người đăng ký</p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-800">Loại vé</h2>
      <div className="space-y-3 mb-8">
        {event.status !== 'cancelled' ? (
          <AddTicketTypeForm event={event} />
        ) : (
          event.ticket_types.length === 0 ? (
            <p className="text-sm text-gray-400">Không có loại vé.</p>
          ) : (
            event.ticket_types.map((tt) => (
              <div key={tt.id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{tt.name}</p>
                  {tt.description && <p className="text-sm text-gray-500">{tt.description}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{tt.issued_count}/{tt.total_quantity}</p>
                  <p className="text-gray-400">đã đăng ký</p>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {event.status === 'published' && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-800">Check-in người tham dự</p>
            <p className="text-sm text-emerald-600">Quét mã QR trên vé điện tử</p>
          </div>
          <Link
            href={`/organizer/events/${id}/checkin`}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            🔍 Mở scanner
          </Link>
        </div>
      )}
      <div className="flex gap-3">
        <Link href="/organizer" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          ← Quay lại
        </Link>
      </div>
    </main>
  )
}
