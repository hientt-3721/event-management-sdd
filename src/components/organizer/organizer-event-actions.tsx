'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { publishEvent, cancelEvent } from '@/features/events/actions'
import type { EventWithTicketTypes } from '@/features/events/types'

interface OrganizerEventActionsProps {
  event: EventWithTicketTypes
}

const actionErrorMessages: Record<string, string> = {
  NO_TICKET_TYPES: 'Cần có ít nhất một loại vé trước khi xuất bản.',
  ALREADY_PUBLISHED: 'Sự kiện đã được xuất bản.',
  ALREADY_CANCELLED: 'Sự kiện đã bị huỷ.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
}

export function OrganizerEventActions({ event }: OrganizerEventActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  function handlePublish() {
    startTransition(async () => {
      setError(null)
      const result = await publishEvent(event.id)
      if (result.error) {
        setError(actionErrorMessages[result.error] ?? result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleCancel() {
    startTransition(async () => {
      setError(null)
      const result = await cancelEvent(event.id)
      if (result.error) {
        setError(actionErrorMessages[result.error] ?? result.error)
      } else {
        router.refresh()
        setConfirmCancel(false)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {event.status === 'draft' && (
          <Button size="sm" onClick={handlePublish} loading={pending}>
            Xuất bản
          </Button>
        )}
        {event.status !== 'cancelled' && !confirmCancel && (
          <Button size="sm" variant="danger" onClick={() => setConfirmCancel(true)}>
            Huỷ sự kiện
          </Button>
        )}
        {confirmCancel && (
          <>
            <Button size="sm" variant="danger" onClick={handleCancel} loading={pending}>
              Xác nhận huỷ
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmCancel(false)}>
              Quay lại
            </Button>
          </>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
