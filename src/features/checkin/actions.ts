'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/features/tickets/types'
import { z } from 'zod'

interface CheckInResult {
  status: 'valid' | 'already_used' | 'cancelled' | 'not_found'
  ticket?: {
    id: string
    attendee_name: string | null
    event_name: string | null
    ticket_type_name: string | null
  }
}

export async function checkInTicket(
  ticketId: string
): Promise<ActionResult<CheckInResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  // Validate UUID
  const uuidSchema = z.string().uuid()
  if (!uuidSchema.safeParse(ticketId).success) {
    return { data: { status: 'not_found' }, error: null }
  }

  const { data: { user: staffUser } } = await supabase.auth.getUser()
  if (!staffUser) return { data: null, error: 'UNAUTHENTICATED' }

  // Use service client for the RPC (SECURITY DEFINER)
  const serviceSupabase = await createServiceClient()
  const { data, error } = await (serviceSupabase as any).rpc('validate_and_check_in', {
    p_ticket_id: ticketId,
    p_staff_id: staffUser.id,
  })

  if (error) return { data: null, error: error.message }

  const result = data as CheckInResult

  // T005: revalidate organizer event page so attendee count updates
  if (result.status === 'valid') {
    const { data: ticketData } = await serviceSupabase
      .from('tickets')
      .select('ticket_types(event_id)')
      .eq('id', ticketId)
      .single()
    const raw = ticketData as unknown as { ticket_types: { event_id: string } | null } | null
    const eventId = raw?.ticket_types?.event_id
    if (eventId) revalidatePath(`/organizer/events/${eventId}`)
  }

  return { data: result, error: null }
}
