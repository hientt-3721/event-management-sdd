'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { registerTicket } from '@/features/tickets/actions'

interface RegisterButtonProps {
  ticketTypeId: string
  ticketTypeName: string
  disabled?: boolean
  soldOutMessage?: string
}

export function RegisterButton({
  ticketTypeId,
  ticketTypeName,
  disabled,
  soldOutMessage,
}: RegisterButtonProps) {
  const t = useTranslations('events')
  const te = useTranslations('errors')
  const [pending, startTransition] = useTransition()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRegister() {
    startTransition(async () => {
      setError(null)
      const result = await registerTicket(ticketTypeId)
      if (result.error) {
        const knownErrors = ['SOLD_OUT', 'ALREADY_REGISTERED', 'EVENT_NOT_PUBLISHED', 'UNAUTHENTICATED', 'FORBIDDEN'] as const
        type ErrorKey = typeof knownErrors[number]
        const key = result.error as string
        setError(knownErrors.includes(key as ErrorKey) ? te(key as ErrorKey) : te('unknown'))
      } else if (result.data) {
        setQrDataUrl(result.data.qrDataUrl)
      }
    })
  }

  if (qrDataUrl) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('registerSuccess')}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <h2 className="mb-1 text-xl font-bold text-gray-900">🎉 {t('registerSuccess')}</h2>
          <p className="mb-4 text-sm text-gray-500">{ticketTypeName}</p>
          <div className="mx-auto mb-4 w-fit rounded-xl border border-gray-200 p-2">
            <Image
              src={qrDataUrl}
              alt={t('qrAlt')}
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <p className="mb-4 text-xs text-gray-400">
            {t('qrHint')}
          </p>
          <Button variant="secondary" onClick={() => setQrDataUrl(null)} className="w-full">
            {t('close')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleRegister}
        loading={pending}
        disabled={disabled || pending}
        className="w-full"
      >
        {soldOutMessage ?? t('register')}
      </Button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
