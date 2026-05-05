'use server'

import { createClient } from '@/lib/supabase/server'
import { generateQrDataUrl } from '@/lib/qr'
import type { ActionResult, TicketWithDetails } from './types'

export async function registerTicket(
  ticketTypeId: string
): Promise<ActionResult<{ ticketId: string; qrDataUrl: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: ticketId, error } = await (supabase as any).rpc('register_ticket', {
    p_attendee_id: user.id,
    p_ticket_type_id: ticketTypeId,
  })

  if (error) {
    const msg = error.message
    if (msg.includes('SOLD_OUT')) return { data: null, error: 'SOLD_OUT' }
    if (msg.includes('ALREADY_REGISTERED')) return { data: null, error: 'ALREADY_REGISTERED' }
    if (msg.includes('EVENT_NOT_PUBLISHED')) return { data: null, error: 'EVENT_NOT_PUBLISHED' }
    return { data: null, error: msg }
  }

  const qrDataUrl = await generateQrDataUrl(ticketId as string)
  return { data: { ticketId: ticketId as string, qrDataUrl }, error: null }
}

export async function cancelTicket(ticketId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('attendee_id, status, ticket_types(event_id, events(start_at))')
    .eq('id', ticketId)
    .single()

  const t = ticket as unknown as { attendee_id: string; status: string; ticket_types: { events: { start_at: string } } } | null
  if (!t) return { data: null, error: 'NOT_FOUND' }
  if (t.attendee_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (t.status !== 'active') return { data: null, error: 'TICKET_NOT_ACTIVE' }

  const eventStart = t.ticket_types?.events?.start_at
  if (eventStart && new Date(eventStart) <= new Date()) {
    return { data: null, error: 'EVENT_ALREADY_STARTED' }
  }

  const { error } = await supabase
    .from('tickets')
    // @ts-ignore
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any)
    .eq('id', ticketId)

  if (error) return { data: null, error: error.message }

  // Cancel pending reminders
  await supabase
    .from('notifications')
    // @ts-ignore
    .update({ status: 'cancelled' } as any)
    .eq('ticket_id', ticketId)
    .eq('status', 'pending')

  return { data: null, error: null }
}

export async function getMyTickets(userId: string): Promise<TicketWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_types (
        id, name, event_id,
        events (id, name, start_at, end_at, location, status)
      )
    `)
    .eq('attendee_id', userId)
    .order('registered_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as TicketWithDetails[]
}

export async function getTicketById(
  id: string,
  userId: string
): Promise<TicketWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_types (
        id, name, event_id,
        events (id, name, start_at, end_at, location, status)
      )
    `)
    .eq('id', id)
    .eq('attendee_id', userId)
    .single()

  if (error || !data) return null
  return data as unknown as TicketWithDetails
}
