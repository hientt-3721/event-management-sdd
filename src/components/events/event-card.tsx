'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BentoCard } from '@/components/ui/bento-card'
import { Badge } from '@/components/ui/badge'
import type { EventWithTicketTypes } from '@/features/events/types'

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

interface EventCardProps {
  event: EventWithTicketTypes
  colSpan?: 1 | 2 | 3 | 4
}

export function EventCard({ event, colSpan = 1 }: EventCardProps) {
  const t = useTranslations('events')
  const totalCapacity = event.ticket_types.reduce((s, tt) => s + tt.total_quantity, 0)
  const totalIssued = event.ticket_types.reduce((s, tt) => s + tt.issued_count, 0)
  const remaining = totalCapacity - totalIssued
  const soldOut = remaining === 0

  return (
    <BentoCard colSpan={colSpan} className="flex flex-col gap-3">
      {event.banner_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.banner_image_url}
          alt=""
          className="h-36 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100">
          <span className="text-4xl">🎪</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">
          {event.name}
        </h2>
        <Badge variant={soldOut ? 'error' : 'success'} className="shrink-0">
          {soldOut ? t('soldOut') : t('available', { count: remaining })}
        </Badge>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
      <div className="mt-auto space-y-1 text-xs text-gray-600">
        <p>📅 {formatDate(event.start_at)}</p>
        <p>📍 {event.location}</p>
      </div>
      <Link
        href={`/events/${event.id}`}
        className="mt-1 block w-full rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        {t('viewDetail')}
      </Link>
    </BentoCard>
  )
}
