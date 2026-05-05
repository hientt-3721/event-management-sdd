'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { registerTicket } from '@/features/tickets/actions'

interface RegisterButtonProps {
  ticketTypeId: string
  ticketTypeName: string
  disabled?: boolean
  soldOutMessage?: string
}

const errorMessages: Record<string, string> = {
  SOLD_OUT: 'Vé đã hết, rất tiếc!',
  ALREADY_REGISTERED: 'Bạn đã đăng ký vé này rồi.',
  EVENT_NOT_PUBLISHED: 'Sự kiện chưa mở đăng ký.',
  UNAUTHENTICATED: 'Vui lòng đăng nhập để đăng ký.',
}

export function RegisterButton({
  ticketTypeId,
  ticketTypeName,
  disabled,
  soldOutMessage,
}: RegisterButtonProps) {
  const [pending, startTransition] = useTransition()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRegister() {
    startTransition(async () => {
      setError(null)
      const result = await registerTicket(ticketTypeId)
      if (result.error) {
        setError(errorMessages[result.error] ?? 'Đã có lỗi xảy ra.')
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
        aria-label="Vé điện tử"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <h2 className="mb-1 text-xl font-bold text-gray-900">🎉 Đăng ký thành công!</h2>
          <p className="mb-4 text-sm text-gray-500">{ticketTypeName}</p>
          <div className="mx-auto mb-4 w-fit rounded-xl border border-gray-200 p-2">
            <Image
              src={qrDataUrl}
              alt="QR code vé của bạn"
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <p className="mb-4 text-xs text-gray-400">
            Xuất trình mã QR này khi check-in tại sự kiện.
          </p>
          <Button variant="secondary" onClick={() => setQrDataUrl(null)} className="w-full">
            Đóng
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
        {soldOutMessage ?? 'Đăng ký tham dự'}
      </Button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
