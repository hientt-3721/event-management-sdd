import { createServiceClient } from '@/lib/supabase/server'

/**
 * Called by register_ticket RPC after inserting a ticket.
 * This module reads pending notifications and can be used to
 * trigger external email delivery. In production the cron job
 * at /api/cron/send-reminders calls this.
 */
export async function scheduleReminders(ticketId: string, eventId: string, attendeeId: string) {
  // Notifications are already inserted by the RPC with scheduled_at set.
  // This function is a no-op placeholder — the cron picks them up.
  void ticketId
  void eventId
  void attendeeId
}
