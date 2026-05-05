import { cookies } from 'next/headers'
import { LangSwitcher } from '@/components/docs/lang-switcher'

const content = {
  vi: {
    title: 'Tài liệu ứng dụng',
    subtitle: 'EventApp — Quản lý sự kiện & vé điện tử',
    sections: [
      {
        heading: 'Giới thiệu',
        body: 'EventApp là ứng dụng quản lý việc tham gia sự kiện toàn diện. Người dùng có thể đăng ký tham dự sự kiện, nhận vé điện tử dưới dạng mã QR và check-in nhanh chóng tại cửa vào.',
      },
      {
        heading: 'Tính năng chính',
        items: [
          '🔐 Đăng nhập qua Google (OAuth 2.0 PKCE)',
          '📅 Xem danh sách sự kiện đang mở đăng ký',
          '🎫 Đăng ký tham dự và nhận vé điện tử (QR)',
          '📱 Quản lý vé cá nhân — xem, huỷ vé',
          '🏢 Ban tổ chức: tạo, xuất bản, huỷ sự kiện; cấu hình loại vé',
          '🔍 Check-in bằng camera: quét và xác thực QR tại cửa',
          '⏰ Nhắc lịch qua email trước 24h và 1h trước sự kiện',
          '🌐 Giao diện song ngữ Tiếng Việt / English',
        ],
      },
      {
        heading: 'Hướng dẫn sử dụng',
        subsections: [
          {
            heading: 'Người tham dự',
            steps: [
              'Đăng nhập bằng tài khoản Google.',
              'Vào trang "Sự kiện" để xem các sự kiện đang mở.',
              'Nhấn "Xem chi tiết" để xem thông tin và chọn loại vé.',
              'Nhấn "Đăng ký tham dự" — mã QR sẽ hiển thị ngay sau khi đăng ký.',
              'Vào "Vé của tôi" để xem lại mã QR bất cứ lúc nào.',
            ],
          },
          {
            heading: 'Ban tổ chức',
            steps: [
              'Đăng nhập với tài khoản có quyền organizer.',
              'Vào "Ban tổ chức" → "Tạo sự kiện".',
              'Điền thông tin sự kiện và thêm các loại vé.',
              'Nhấn "Xuất bản" để mở đăng ký cho người dùng.',
              'Tại trang chi tiết sự kiện, nhấn "Check-in" để mở trang quét QR.',
            ],
          },
        ],
      },
      {
        heading: 'Công nghệ sử dụng',
        items: [
          'Next.js 14 (App Router, Server Actions)',
          'Supabase (PostgreSQL + Auth + Storage + Realtime)',
          'Tailwind CSS — Bento Grid layout',
          'next-intl — đa ngôn ngữ',
          'Resend — gửi email nhắc lịch',
          'Vercel — hosting & cron jobs',
        ],
      },
    ],
  },
  en: {
    title: 'Documentation',
    subtitle: 'EventApp — Event Management & Digital Tickets',
    sections: [
      {
        heading: 'Overview',
        body: 'EventApp is a comprehensive event registration platform. Users can register for events, receive digital tickets as QR codes, and check in quickly at the entrance.',
      },
      {
        heading: 'Key Features',
        items: [
          '🔐 Google Sign-In (OAuth 2.0 PKCE)',
          '📅 Browse open events',
          '🎫 Register and receive a digital QR ticket',
          '📱 My Tickets — view and cancel tickets',
          '🏢 Organizer: create, publish, cancel events; configure ticket types',
          '🔍 Camera-based check-in: scan and validate QR codes',
          '⏰ Email reminders 24h and 1h before event start',
          '🌐 Bilingual UI — Vietnamese / English',
        ],
      },
      {
        heading: 'How to Use',
        subsections: [
          {
            heading: 'Attendees',
            steps: [
              'Sign in with your Google account.',
              'Go to "Events" to browse upcoming events.',
              'Click "View Details" to select a ticket type.',
              'Click "Register" — your QR code appears instantly.',
              'Visit "My Tickets" to view your QR code at any time.',
            ],
          },
          {
            heading: 'Organizers',
            steps: [
              'Sign in with an organizer account.',
              'Go to "Organizer" → "Create Event".',
              'Fill in event details and add ticket types.',
              'Click "Publish" to open registration.',
              'From the event detail page, click "Check-In" to open the QR scanner.',
            ],
          },
        ],
      },
      {
        heading: 'Technology Stack',
        items: [
          'Next.js 14 (App Router, Server Actions)',
          'Supabase (PostgreSQL + Auth + Storage + Realtime)',
          'Tailwind CSS — Bento Grid layout',
          'next-intl — i18n',
          'Resend — email reminders',
          'Vercel — hosting & cron jobs',
        ],
      },
    ],
  },
} as const

type Lang = keyof typeof content
type Section = (typeof content.vi.sections)[number]

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value ?? 'vi') as Lang
  const lang: Lang = locale === 'en' ? 'en' : 'vi'
  const c = content[lang]

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{c.title}</h1>
          <p className="mt-1 text-gray-500">{c.subtitle}</p>
        </div>
        <LangSwitcher currentLang={lang} />
      </div>

      <div className="space-y-10">
        {c.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-xl font-semibold text-gray-800">{section.heading}</h2>
            {'body' in section && section.body && (
              <p className="text-gray-600 leading-relaxed">{section.body}</p>
            )}
            {'items' in section && section.items && (
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-gray-600">
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {'subsections' in section && section.subsections && (
              <div className="space-y-6">
                {section.subsections.map((sub) => (
                  <div key={sub.heading}>
                    <h3 className="mb-2 text-base font-semibold text-gray-700">{sub.heading}</h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                      {sub.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
