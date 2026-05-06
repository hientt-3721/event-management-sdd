'use client'

import { useTranslations } from 'next-intl'
import { BentoGrid } from '@/components/ui/bento-grid'
import { EventCard } from './event-card'
import type { EventWithTicketTypes } from '@/features/events/types'

interface EventListProps {
  events: EventWithTicketTypes[]
}

export function EventList({ events }: EventListProps) {
  const t = useTranslations('events')
  if (events.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p className="text-lg">{t('empty')}</p>
        <p className="mt-1 text-sm">{t('emptyHint')}</p>
      </div>
    )
  }

  return (
    <BentoGrid>
      {events.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          // Every 5th card (0-indexed: 0, 5, 10…) spans 2 columns for visual variety
          colSpan={i % 5 === 0 ? 2 : 1}
        />
      ))}
    </BentoGrid>
  )
}
