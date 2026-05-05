import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTicketById } from '@/features/tickets/actions'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { CancelTicketButton } from '@/components/tickets/cancel-ticket-button'
import { generateQrDataUrl } from '@/lib/qr'

interface TicketDetailPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const ticket = await getTicketById(id, user.id)
  if (!ticket) notFound()

  const event = ticket.ticket_types.events
  const qrDataUrl = ticket.status === 'active' ? await generateQrDataUrl(ticket.id) : null

  const statusLabel: Record<string, string> = {
    active: 'Còn hiệu lực',
    used: 'Đã sử dụng',
    cancelled: 'Đã huỷ',
  }
  const statusVariant: Record<string, 'success' | 'error' | 'default'> = {
    active: 'success',
    used: 'default',
    cancelled: 'error',
  }

  const eventStarted = event?.start_at ? new Date(event.start_at) <= new Date() : false

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Chi tiết vé</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{event?.name}</p>
            <p className="text-sm text-gray-500">{ticket.ticket_types.name}</p>
          </div>
          <Badge variant={statusVariant[ticket.status] ?? 'default'}>
            {statusLabel[ticket.status] ?? ticket.status}
          </Badge>
        </div>

        {event?.start_at && (
          <p className="text-sm text-gray-600">
            📅 {new Intl.DateTimeFormat('vi-VN', {
              weekday: 'short', year: 'numeric', month: 'short',
              day: 'numeric', hour: '2-digit', minute: '2-digit',
            }).format(new Date(event.start_at))}
          </p>
        )}
        {event?.location && (
          <p className="text-sm text-gray-600">📍 {event.location}</p>
        )}

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="rounded-xl border border-gray-200 p-2">
              <Image
                src={qrDataUrl}
                alt="QR code vé của bạn"
                width={200}
                height={200}
                unoptimized
              />
            </div>
            <p className="text-xs text-gray-400">Mã vé: {ticket.id.slice(0, 8).toUpperCase()}</p>
          </div>
        )}

        {ticket.status === 'active' && !eventStarted && (
          <CancelTicketButton ticketId={ticket.id} />
        )}
      </div>
    </main>
  )
}
