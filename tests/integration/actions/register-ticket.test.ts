import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
const mockRpc = vi.fn()
const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } })),
  },
  rpc: mockRpc,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))
vi.mock('@/lib/qr', () => ({
  generateQrDataUrl: vi.fn(() => Promise.resolve('data:image/png;base64,fakeqr')),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []) })),
}))

describe('registerTicket Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ticketId and qrDataUrl on success', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'ticket-uuid-001', error: null })

    const { registerTicket } = await import('@/features/tickets/actions')
    const result = await registerTicket('ticket-type-id-001')

    expect(result.error).toBeNull()
    expect(result.data?.ticketId).toBe('ticket-uuid-001')
    expect(result.data?.qrDataUrl).toBe('data:image/png;base64,fakeqr')
  })

  it('returns SOLD_OUT error when capacity exhausted', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'SOLD_OUT: no tickets remaining for this ticket type' },
    })

    const { registerTicket } = await import('@/features/tickets/actions')
    const result = await registerTicket('ticket-type-id-001')

    expect(result.data).toBeNull()
    expect(result.error).toBe('SOLD_OUT')
  })

  it('returns ALREADY_REGISTERED error on duplicate registration', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ALREADY_REGISTERED: attendee already has a ticket for this event' },
    })

    const { registerTicket } = await import('@/features/tickets/actions')
    const result = await registerTicket('ticket-type-id-001')

    expect(result.data).toBeNull()
    expect(result.error).toBe('ALREADY_REGISTERED')
  })
})
