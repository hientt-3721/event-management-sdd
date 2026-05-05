import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { EventWithTicketTypes } from '@/features/events/types'

interface OrganizerEventListProps {
  events: EventWithTicketTypes[]
}

const statusLabel: Record<string, string> = {
  draft: 'Nháp',
  published: 'Đang mở',
  cancelled: 'Đã huỷ',
}
const statusVariant: Record<string, 'default' | 'success' | 'error'> = {
  draft: 'default',
  published: 'success',
  cancelled: 'error',
}

export function OrganizerEventList({ events }: OrganizerEventListProps) {
  if (events.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p className="text-lg">Chưa có sự kiện nào.</p>
        <p className="mt-1 text-sm">Tạo sự kiện đầu tiên của bạn ngay!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const totalIssued = event.ticket_types.reduce((s, tt) => s + tt.issued_count, 0)
        const totalCapacity = event.ticket_types.reduce((s, tt) => s + tt.total_quantity, 0)

        return (
          <Link
            key={event.id}
            href={`/organizer/events/${event.id}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant={statusVariant[event.status]}>
                  {statusLabel[event.status]}
                </Badge>
                <h2 className="text-sm font-semibold text-gray-900 truncate">{event.name}</h2>
              </div>
              <p className="text-xs text-gray-500">
                {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(event.start_at))}
                {' · '}
                {totalIssued}/{totalCapacity} đăng ký
              </p>
            </div>
            <span className="ml-3 text-gray-400">→</span>
          </Link>
        )
      })}
    </div>
  )
}
