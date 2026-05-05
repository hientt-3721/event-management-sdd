import QRCode from 'qrcode'

/**
 * Generates a base64 PNG data URL containing only the ticket UUID.
 * No PII is embedded in the QR code payload.
 * Server-side only.
 */
export async function generateQrDataUrl(ticketId: string): Promise<string> {
  return QRCode.toDataURL(ticketId, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    width: 300,
  })
}
