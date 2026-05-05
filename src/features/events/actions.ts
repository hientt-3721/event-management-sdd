'use server'

import { createClient } from '@/lib/supabase/server'
import { generateQrDataUrl } from '@/lib/qr'
import type { ActionResult } from './types'
import type { Database } from '@/types/database'
import { z } from 'zod'

type EventRow = Database['public']['Tables']['events']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type TicketRow = Database['public']['Tables']['tickets']['Row']

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  location: z.string().min(1).max(500),
  banner_image_url: z.string().url().optional(),
})

export async function createEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const p = profile as unknown as Pick<ProfileRow, 'role'> | null
  if (!p || p.role !== 'organizer') return { data: null, error: 'FORBIDDEN' }

  const parsed = createEventSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'VALIDATION_ERROR' }

  const { data, error } = await supabase
    .from('events')
    // @ts-ignore
    .insert(({ ...parsed.data, organizer_id: user.id }) as any)
    .select('id')
    .single()

  const row = data as unknown as Pick<EventRow, 'id'> | null
  if (error || !row) return { data: null, error: error?.message ?? 'DB_ERROR' }
  return { data: { id: row.id }, error: null }
}

export async function updateEvent(id: string, input: unknown): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: existing } = await supabase
    .from('events').select('organizer_id, status').eq('id', id).single()
  const ev = existing as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!ev) return { data: null, error: 'NOT_FOUND' }
  if (ev.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (ev.status === 'cancelled') return { data: null, error: 'EVENT_CANCELLED' }

  const parsed = createEventSchema.partial().safeParse(input)
  if (!parsed.success) return { data: null, error: 'VALIDATION_ERROR' }

  // @ts-ignore
  const { error } = await supabase.from('events').update(parsed.data as any).eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function publishEvent(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: event } = await supabase
    .from('events').select('organizer_id, status').eq('id', id).single()
  const ev = event as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!ev) return { data: null, error: 'NOT_FOUND' }
  if (ev.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (ev.status === 'published') return { data: null, error: 'ALREADY_PUBLISHED' }

  const { count } = await supabase
    .from('ticket_types')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
  if (!count || count === 0) return { data: null, error: 'NO_TICKET_TYPES' }

  const { error } = await supabase
    // @ts-ignore
    .from('events').update({ status: 'published' } as any).eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function cancelEvent(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: event } = await supabase
    .from('events').select('organizer_id, status').eq('id', id).single()
  const ev = event as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!ev) return { data: null, error: 'NOT_FOUND' }
  if (ev.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (ev.status === 'cancelled') return { data: null, error: 'ALREADY_CANCELLED' }

  // @ts-ignore
  await supabase.from('events').update({ status: 'cancelled' } as Database['public']['Tables']['events']['Update']).eq('id', id)

  // Get ticket type ids for this event
  const { data: ttIds } = await supabase
    .from('ticket_types').select('id').eq('event_id', id)

  if (ttIds && ttIds.length) {
    const ids = (ttIds as unknown as Array<{ id: string }>).map(r => r.id)
    const { data: affectedTickets } = await supabase
      .from('tickets')
      .select('id, attendee_id')
      .in('ticket_type_id', ids)
      .eq('status', 'active')

    const tickets = affectedTickets as unknown as Array<Pick<TicketRow, 'id' | 'attendee_id'>> | null

    if (tickets?.length) {
      await supabase.from('tickets')
        // @ts-ignore
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as Database['public']['Tables']['tickets']['Update'])
        .in('id', tickets.map(t => t.id))

      const now = new Date().toISOString()
      const notifications = tickets.map(t => ({
        attendee_id: t.attendee_id,
        event_id: id,
        ticket_id: t.id,
        type: 'cancellation' as const,
        scheduled_at: now,
      }))

      // @ts-ignore
      await supabase.from('notifications').upsert(
        notifications as any,
        { onConflict: 'attendee_id,event_id,type' }
      )
    }
  }

  await supabase
    .from('notifications')
    // @ts-ignore
    .update({ status: 'cancelled' } as Database['public']['Tables']['notifications']['Update'])
    .eq('event_id', id)
    .eq('status', 'pending')
    .in('type', ['reminder_24h', 'reminder_1h'])

  return { data: null, error: null }
}

export async function addTicketType(
  eventId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: event } = await supabase
    .from('events').select('organizer_id, status').eq('id', eventId).single()
  const ev = event as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!ev) return { data: null, error: 'NOT_FOUND' }
  if (ev.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (ev.status === 'cancelled') return { data: null, error: 'EVENT_CANCELLED' }

  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    total_quantity: z.number().int().min(1).max(100000),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'VALIDATION_ERROR' }

  const { data, error } = await supabase
    .from('ticket_types')
    // @ts-ignore
    .insert({ event_id: eventId, ...parsed.data } as unknown as Database['public']['Tables']['ticket_types']['Insert'])
    .select('id')
    .single()

  const row = data as unknown as { id: string } | null
  if (error || !row) return { data: null, error: error?.message ?? 'DB_ERROR' }
  return { data: { id: row.id }, error: null }
}

export async function updateTicketType(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: tt } = await supabase
    .from('ticket_types')
    .select('event_id')
    .eq('id', id)
    .single()

  const ttRow = tt as unknown as { event_id: string } | null
  if (!ttRow) return { data: null, error: 'NOT_FOUND' }

  const { data: ev } = await supabase
    .from('events').select('organizer_id, status').eq('id', ttRow.event_id).single()
  const evRow = ev as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!evRow) return { data: null, error: 'NOT_FOUND' }
  if (evRow.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (evRow.status !== 'draft') return { data: null, error: 'EVENT_NOT_DRAFT' }

  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    total_quantity: z.number().int().min(1).optional(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { data: null, error: 'VALIDATION_ERROR' }

  // @ts-ignore
  const { error } = await supabase.from('ticket_types').update(parsed.data as unknown as Database['public']['Tables']['ticket_types']['Update']).eq('id', id)
  if (error) {
    if (error.message.includes('QUANTITY_BELOW_ISSUED')) return { data: null, error: 'QUANTITY_BELOW_ISSUED' }
    return { data: null, error: error.message }
  }
  return { data: null, error: null }
}

export async function deleteTicketType(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  const { data: tt } = await supabase
    .from('ticket_types').select('event_id').eq('id', id).single()
  const ttRow = tt as unknown as { event_id: string } | null
  if (!ttRow) return { data: null, error: 'NOT_FOUND' }

  const { data: ev } = await supabase
    .from('events').select('organizer_id, status').eq('id', ttRow.event_id).single()
  const evRow = ev as unknown as Pick<EventRow, 'organizer_id' | 'status'> | null
  if (!evRow) return { data: null, error: 'NOT_FOUND' }
  if (evRow.organizer_id !== user.id) return { data: null, error: 'FORBIDDEN' }
  if (evRow.status !== 'draft') return { data: null, error: 'EVENT_NOT_DRAFT' }

  const { count } = await supabase
    .from('tickets').select('*', { count: 'exact', head: true })
    .eq('ticket_type_id', id).neq('status', 'cancelled')
  if (count && count > 0) return { data: null, error: 'HAS_ISSUED_TICKETS' }

  const { error } = await supabase.from('ticket_types').delete().eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

export async function uploadEventBanner(
  eventId: string,
  file: File
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'UNAUTHENTICATED' }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return { data: null, error: 'INVALID_FILE_TYPE' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { data: null, error: 'FILE_TOO_LARGE' }
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${eventId}/banner.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('event-banners')
    .upload(path, file, { upsert: true })

  if (uploadError) return { data: null, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('event-banners')
    .getPublicUrl(path)

  return { data: { url: publicUrl }, error: null }
}
