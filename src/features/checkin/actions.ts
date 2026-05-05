'use server'

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
  return { data: result, error: null }
}
