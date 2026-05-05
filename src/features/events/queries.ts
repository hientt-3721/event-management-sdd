import { createClient } from '@/lib/supabase/server'
import type { EventWithTicketTypes } from './types'
import type { Database } from '@/types/database'

type EventRow = Database['public']['Tables']['events']['Row']
type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row']
type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function attachIssuedCounts(
  supabase: SupabaseClient,
  events: Array<EventRow & { ticket_types: TicketTypeRow[] }>
): Promise<EventWithTicketTypes[]> {
  return Promise.all(
    events.map(async (event) => {
      const ticketTypesWithCount = await Promise.all(
        event.ticket_types.map(async (tt) => {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_type_id', tt.id)
            .neq('status', 'cancelled')
          return { ...tt, issued_count: count ?? 0 }
        })
      )
      return { ...event, ticket_types: ticketTypesWithCount } as EventWithTicketTypes
    })
  )
}

export async function getPublishedEvents(): Promise<EventWithTicketTypes[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('status', 'published')
    .order('start_at', { ascending: true })

  if (error || !data) return []
  return attachIssuedCounts(supabase, data as unknown as Array<EventRow & { ticket_types: TicketTypeRow[] }>)
}

export async function getEventById(id: string): Promise<EventWithTicketTypes | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  const [event] = await attachIssuedCounts(
    supabase,
    [data as unknown as EventRow & { ticket_types: TicketTypeRow[] }]
  )
  return event ?? null
}

export async function getOrganizerEvents(organizerId: string): Promise<EventWithTicketTypes[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, ticket_types(*)')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return attachIssuedCounts(supabase, data as unknown as Array<EventRow & { ticket_types: TicketTypeRow[] }>)
}
