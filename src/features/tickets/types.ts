import type { Database } from '@/types/database'

export type Ticket = Database['public']['Tables']['tickets']['Row']
export type TicketInsert = Database['public']['Tables']['tickets']['Insert']

export type TicketWithDetails = Ticket & {
  ticket_types: {
    id: string
    name: string
    event_id: string
    events: {
      id: string
      name: string
      start_at: string
      end_at: string
      location: string
      status: Database['public']['Enums']['event_status']
    }
  }
}

export type ActionResult<T> = {
  data: T | null
  error: string | null
}
