'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cancelTicket } from '@/features/tickets/actions'

interface CancelTicketButtonProps {
  ticketId: string
}

export function CancelTicketButton({ ticketId }: CancelTicketButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  if (!confirming) {
    return (
      <Button
        variant="danger"
        className="w-full"
        onClick={() => setConfirming(true)}
      >
        Huỷ vé
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Bạn có chắc muốn huỷ vé này không?</p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          loading={pending}
          className="flex-1"
          onClick={() => {
            startTransition(async () => {
              setError(null)
              const result = await cancelTicket(ticketId)
              if (result.error) {
                setError('Không thể huỷ vé. Vui lòng thử lại.')
              } else {
                router.push('/tickets')
              }
            })
          }}
        >
          Xác nhận huỷ
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          Quay lại
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
