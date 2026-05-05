'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { checkInTicket } from '@/features/checkin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const Html5QrCodeScanner = dynamic(
  () => import('@/components/checkin/qr-scanner-core'),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-gray-100 animate-pulse" /> }
)

interface ScanResult {
  status: 'valid' | 'already_used' | 'cancelled' | 'not_found' | 'error'
  message: string
  attendeeName?: string | null
  eventName?: string | null
}

const statusConfig: Record<ScanResult['status'], { variant: 'success' | 'error' | 'warning' | 'default'; label: string }> = {
  valid: { variant: 'success', label: '✓ Hợp lệ' },
  already_used: { variant: 'warning', label: '⚠ Đã sử dụng' },
  cancelled: { variant: 'error', label: '✕ Đã huỷ' },
  not_found: { variant: 'error', label: '✕ Không tìm thấy' },
  error: { variant: 'error', label: '✕ Lỗi' },
}

export function CheckInScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const lastScan = useRef<string>('')

  const handleScan = useCallback(async (ticketId: string) => {
    if (processing || ticketId === lastScan.current) return
    lastScan.current = ticketId
    setProcessing(true)
    setScanning(false)

    const res = await checkInTicket(ticketId)
    if (res.error) {
      setResult({ status: 'error', message: res.error })
    } else if (res.data) {
      const messages: Record<string, string> = {
        valid: `Check-in thành công!`,
        already_used: 'Vé này đã được sử dụng.',
        cancelled: 'Vé này đã bị huỷ.',
        not_found: 'Không tìm thấy vé.',
      }
      setResult({
        status: res.data.status,
        message: messages[res.data.status] ?? res.data.status,
        attendeeName: res.data.ticket?.attendee_name,
        eventName: res.data.ticket?.event_name,
      })
    }
    setProcessing(false)
  }, [processing])

  function reset() {
    setResult(null)
    lastScan.current = ''
    setScanning(true)
  }

  useEffect(() => {
    setScanning(true)
  }, [])

  return (
    <div className="space-y-4">
      {scanning && (
        <Html5QrCodeScanner onScan={handleScan} />
      )}

      {processing && (
        <div className="flex items-center justify-center h-32 rounded-xl border border-gray-200 bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      )}

      {result && !processing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig[result.status].variant}>
              {statusConfig[result.status].label}
            </Badge>
          </div>
          <p className="text-sm font-medium text-gray-800">{result.message}</p>
          {result.attendeeName && (
            <p className="text-sm text-gray-600">👤 {result.attendeeName}</p>
          )}
          {result.eventName && (
            <p className="text-sm text-gray-600">🎪 {result.eventName}</p>
          )}
          <Button onClick={reset} variant="secondary" className="w-full">
            Quét vé tiếp theo
          </Button>
        </div>
      )}
    </div>
  )
}
