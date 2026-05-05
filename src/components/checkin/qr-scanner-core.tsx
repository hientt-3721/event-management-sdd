'use client'

import { useEffect, useRef } from 'react'

interface QrScannerCoreProps {
  onScan: (ticketId: string) => void
}

export default function QrScannerCore({ onScan }: QrScannerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode')['Html5QrcodeScanner']> | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      if (!mounted || !containerRef.current) return

      const scannerId = 'qr-scanner-element'
      containerRef.current.id = scannerId

      const scanner = new Html5QrcodeScanner(
        scannerId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render(
        (decodedText: string) => {
          onScan(decodedText.trim())
        },
        () => { /* ignore errors */ }
      )

      scannerRef.current = scanner
    }

    init()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [onScan])

  return <div ref={containerRef} className="rounded-xl overflow-hidden" />
}
