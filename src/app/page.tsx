import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const features = [
  {
    icon: '🎟️',
    title: 'Vé điện tử',
    desc: 'Nhận vé QR ngay sau khi đăng ký, lưu trên điện thoại.',
  },
  {
    icon: '📱',
    title: 'Check-in nhanh',
    desc: 'Quét QR tại cửa, xác nhận tham dự trong vài giây.',
  },
  {
    icon: '📊',
    title: 'Quản lý sự kiện',
    desc: 'Ban tổ chức dễ dàng tạo sự kiện, quản lý loại vé và theo dõi người tham dự.',
  },
]

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profileResult = user
    ? (await supabase.from('profiles').select('role').eq('id', user.id).single()).data
    : null
  const role = (profileResult as { role: string } | null)?.role

  const primaryHref =
    role === 'organizer' || role === 'staff' ? '/organizer' : '/events'
  const primaryLabel =
    role === 'organizer' || role === 'staff' ? 'Vào trang tổ chức' : 'Xem sự kiện'

  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center px-4 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />

        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          🎉 Nền tảng quản lý sự kiện đơn giản
        </span>

        <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Sự kiện của bạn,<br />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            đơn giản hơn bao giờ hết
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-lg text-gray-500">
          Đăng ký tham dự, nhận vé điện tử QR và check-in nhanh chóng tại mọi sự kiện.
          Dành cho cả người tham dự lẫn ban tổ chức.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            {primaryLabel}
          </Link>
          {!user && (
            <Link
              href="/login"
              className="rounded-xl border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
          Tất cả những gì bạn cần
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

