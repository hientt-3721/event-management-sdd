import type { Database } from '@/types/database'

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type TicketType = Database['public']['Tables']['ticket_types']['Row']
export type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']

export type EventWithTicketTypes = Event & {
  ticket_types: (TicketType & { issued_count: number })[]
}

export type CreateEventInput = {
  name: string
  description: string
  start_at: string
  end_at: string
  location: string
  banner_image_url?: string
}

export type TicketTypeInput = {
  name: string
  description?: string
  total_quantity: number
}

export type ActionResult<T> = {
  data: T | null
  error: string | null
}
