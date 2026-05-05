import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMyTickets } from '@/features/tickets/actions'
import { TicketCard } from '@/components/tickets/ticket-card'
import { BentoGrid } from '@/components/ui/bento-grid'

export const dynamic = 'force-dynamic'

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tickets = await getMyTickets(user.id)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vé của tôi</h1>
        <p className="mt-2 text-gray-500">Quản lý và xem vé điện tử của bạn.</p>
      </div>
      {tickets.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="text-lg">Bạn chưa có vé nào.</p>
          <p className="mt-1 text-sm">
            <a href="/events" className="text-indigo-600 underline">Xem sự kiện</a> để đăng ký tham dự.
          </p>
        </div>
      ) : (
        <BentoGrid>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </BentoGrid>
      )}
    </main>
  )
}
