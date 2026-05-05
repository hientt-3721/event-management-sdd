import { notFound } from 'next/navigation'
import { getEventById } from '@/features/events/queries'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { RegisterButton } from '@/components/events/register-button'
import Link from 'next/link'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

function formatDateRange(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${fmt.format(new Date(start))} – ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(end))}`
}

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params
  const event = await getEventById(id)
  if (!event) notFound()

  // Optional auth — don't redirect if unauthenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {event.banner_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.banner_image_url}
          alt=""
          className="mb-6 h-56 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="mb-6 h-40 w-full rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <span className="text-5xl">🎪</span>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <Badge variant="info">Đang mở đăng ký</Badge>
      </div>
      <h1 className="mb-3 text-3xl font-bold text-gray-900">{event.name}</h1>
      <p className="mb-6 text-gray-600">{event.description}</p>

      <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
        <p>📅 {formatDateRange(event.start_at, event.end_at)}</p>
        <p>📍 {event.location}</p>
      </div>

      <h2 className="mb-4 text-xl font-semibold text-gray-800">Loại vé</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {event.ticket_types.map((tt) => {
          const remaining = tt.total_quantity - tt.issued_count
          const soldOut = remaining === 0
          return (
            <div
              key={tt.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{tt.name}</h3>
                <Badge variant={soldOut ? 'error' : 'success'}>
                  {soldOut ? 'Hết vé' : `${remaining} còn lại`}
                </Badge>
              </div>
              {tt.description && (
                <p className="mb-3 text-sm text-gray-500">{tt.description}</p>
              )}
              {user ? (
                <RegisterButton
                  ticketTypeId={tt.id}
                  ticketTypeName={tt.name}
                  disabled={soldOut || event.status !== 'published'}
                  soldOutMessage={soldOut ? 'Hết vé' : undefined}
                />
              ) : (
                <Link
                  href={`/login?next=/events/${event.id}`}
                  className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Đăng nhập để đăng ký
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
