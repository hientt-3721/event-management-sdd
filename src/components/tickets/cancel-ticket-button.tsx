'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cancelTicket } from '@/features/tickets/actions'

interface CancelTicketButtonProps {
  ticketId: string
}

export function CancelTicketButton({ ticketId }: CancelTicketButtonProps) {
  const t = useTranslations('tickets')
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
        {t('cancelTicket')}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">{t('confirmCancelMessage')}</p>
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
                setError(t('cancelError'))
              } else {
                router.refresh()
                router.push('/tickets')
              }
            })
          }}
        >
          {t('confirmCancel')}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          {t('goBack')}
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
