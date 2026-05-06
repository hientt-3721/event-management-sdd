'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BentoCard } from '@/components/ui/bento-card'
import { Badge } from '@/components/ui/badge'
import type { TicketWithDetails } from '@/features/tickets/types'

interface TicketCardProps {
  ticket: TicketWithDetails
}

const statusVariant: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success',
  used: 'default',
  cancelled: 'error',
}

export function TicketCard({ ticket }: TicketCardProps) {
  const t = useTranslations('tickets')
  const event = ticket.ticket_types.events

  return (
    <BentoCard className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">
          {event?.name ?? 'Sự kiện'}
        </h2>
        <Badge variant={statusVariant[ticket.status] ?? 'default'} className="shrink-0">
          {t(`status.${ticket.status as 'active' | 'used' | 'cancelled'}`)}
        </Badge>
      </div>
      <p className="text-sm text-gray-500">{ticket.ticket_types.name}</p>
      {event?.start_at && (
        <p className="text-xs text-gray-400">
          📅 {new Intl.DateTimeFormat('vi-VN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(new Date(event.start_at))}
        </p>
      )}
      <Link
        href={`/tickets/${ticket.id}`}
        className="mt-auto block w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        {t('viewTicket')}
      </Link>
    </BentoCard>
  )
}
