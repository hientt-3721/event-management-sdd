import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Initialize Resend lazily to avoid build-time errors
  const resend = new Resend(process.env.RESEND_API_KEY)

  const supabase = await createServiceClient()
  const now = new Date().toISOString()

  // Fetch pending notifications due now
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select(`
      id,
      type,
      attendee_id,
      event_id,
      ticket_id,
      profiles!notifications_attendee_id_fkey (
        full_name,
        email
      ),
      events!notifications_event_id_fkey (
        name,
        start_at,
        location
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(100)

  if (error) {
    console.error('[cron] fetch error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const notifRaw of notifications ?? []) {
    const notif = notifRaw as unknown as {
      id: string
      type: string
      profiles: { display_name: string | null; email: string | null } | null
      events: { name: string | null; start_at: string | null; location: string | null } | null
    }
    const profile = notif.profiles
    const event = notif.events

    if (!profile?.email) {
      // Mark as skipped (no email on profile)
      // @ts-ignore
      await supabase.from('notifications').update({ status: 'sent' } as any).eq('id', notif.id)
      continue
    }

    const isReminder = notif.type === 'reminder_24h' || notif.type === 'reminder_1h'
    const subject = isReminder
      ? `⏰ Nhắc nhở: "${event?.name}" sắp bắt đầu`
      : `❌ Sự kiện "${event?.name}" đã bị huỷ`

    const htmlBody = isReminder
      ? `<p>Xin chào${profile.display_name ? ` ${profile.display_name}` : ''},</p>
         <p>Sự kiện <strong>${event?.name}</strong> sẽ bắt đầu vào ${event?.start_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.start_at)) : ''} tại <em>${event?.location}</em>.</p>
         <p>Đừng quên mang vé điện tử khi đến tham dự nhé!</p>`
      : `<p>Xin chào${profile.display_name ? ` ${profile.display_name}` : ''},</p>
         <p>Rất tiếc, sự kiện <strong>${event?.name}</strong> đã bị huỷ. Vé của bạn đã được hoàn lại.</p>`

    try {
      await resend.emails.send({
        from: 'EventApp <noreply@eventapp.example.com>',
        to: [profile.email],
        subject,
        html: htmlBody,
      })

      // @ts-ignore
      await supabase.from('notifications').update({ status: 'sent', sent_at: new Date().toISOString() } as any).eq('id', notif.id)
      sent++
    } catch {
      // @ts-ignore
      await supabase.from('notifications').update({ status: 'failed' } as any).eq('id', notif.id)
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}
