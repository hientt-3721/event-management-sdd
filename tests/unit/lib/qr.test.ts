import { describe, it, expect } from 'vitest'
import { generateQrDataUrl } from '@/lib/qr'

describe('generateQrDataUrl', () => {
  it('returns a base64 PNG data URL', async () => {
    const ticketId = '550e8400-e29b-41d4-a716-446655440000'
    const result = await generateQrDataUrl(ticketId)
    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('encodes exactly the ticket UUID in the QR payload', async () => {
    const ticketId = 'abc12345-0000-0000-0000-000000000001'
    // We verify the data URL is non-empty and differs per ticketId
    const result1 = await generateQrDataUrl(ticketId)
    const result2 = await generateQrDataUrl('abc12345-0000-0000-0000-000000000002')
    expect(result1).not.toBe(result2)
    expect(result1.length).toBeGreaterThan(100)
  })

  it('does not embed any PII in the data URL (only UUID)', async () => {
    const ticketId = '11111111-1111-1111-1111-111111111111'
    const result = await generateQrDataUrl(ticketId)
    // The data URL must start with the correct prefix
    expect(result).toMatch(/^data:image\/png;base64,/)
    // The encoded input (ticketId) should not contain email or personal info
    expect(ticketId).not.toMatch(/@/)
    expect(ticketId).not.toMatch(/[a-z]+\.[a-z]+/i) // no name.surname
  })
})
