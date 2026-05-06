import { cookies } from 'next/headers'
import { LangSwitcher } from '@/components/docs/lang-switcher'
import { TerminalBlock } from '@/components/docs/terminal-block'
import { DemoAccounts } from '@/components/docs/demo-accounts'

export const dynamic = 'force-dynamic'

const demoAccounts = {
  vi: [
    {
      role: 'Người tham dự',
      email: 'demo@attendee.com',
      password: 'Demo1234!',
      description: 'Tài khoản demo cho người tham dự',
    },
    {
      role: 'Ban tổ chức',
      email: 'demo@organizer.com',
      password: 'Demo1234!',
      description: 'Tài khoản demo cho ban tổ chức',
    },
  ],
  en: [
    {
      role: 'Attendee',
      email: 'demo@attendee.com',
      password: 'Demo1234!',
      description: 'Demo account for event attendees',
    },
    {
      role: 'Organizer',
      email: 'demo@organizer.com',
      password: 'Demo1234!',
      description: 'Demo account for event organizers',
    },
  ],
}

const content = {
  vi: {
    title: 'Tài liệu ứng dụng',
    subtitle: 'EventApp — Quản lý sự kiện & vé điện tử',
    demoTitle: 'Tài khoản demo',
    demoHint: 'Dùng các tài khoản dưới đây để trải nghiệm ứng dụng ngay lập tức.',
    loginHint: 'Đăng nhập bằng Email trên trang login.',
    features: {
      heading: 'Tính năng chính',
      items: [
        '🔐 Đăng nhập qua Google hoặc Email/Password',
        '📅 Xem danh sách sự kiện đang mở đăng ký',
        '🎫 Đăng ký tham dự và nhận vé điện tử (QR)',
        '📱 Quản lý vé cá nhân — xem, huỷ vé',
        '🏢 Ban tổ chức: tạo, xuất bản, huỷ sự kiện; cấu hình loại vé',
        '🔍 Check-in bằng camera: quét và xác thực QR tại cửa',
        '⏰ Nhắc lịch qua email trước 24h và 1h trước sự kiện',
        '🌐 Giao diện song ngữ Tiếng Việt / English',
      ],
    },
    attendeeGuide: {
      heading: 'Hướng dẫn người tham dự',
      steps: [
        'Truy cập /events để xem danh sách sự kiện',
        'Chọn sự kiện và nhấn "Đăng ký tham dự"',
        'Nhận mã QR ngay trên màn hình',
        'Vào /tickets để xem và quản lý vé',
      ],
    },
    organizerGuide: {
      heading: 'Hướng dẫn ban tổ chức',
      steps: [
        'Truy cập /organizer sau khi đăng nhập',
        'Nhấn "+ Tạo sự kiện" để tạo sự kiện mới',
        'Thêm loại vé và xuất bản sự kiện',
        'Vào trang check-in để quét QR của người tham dự',
      ],
    },
    devSetup: {
      heading: 'Cài đặt môi trường phát triển',
    },
  },
  en: {
    title: 'Documentation',
    subtitle: 'EventApp — Event Management & Digital Tickets',
    demoTitle: 'Demo Accounts',
    demoHint: 'Use the accounts below to try the app instantly.',
    loginHint: 'Use "Sign in with Email" on the login page.',
    features: {
      heading: 'Key Features',
      items: [
        '🔐 Sign in via Google or Email/Password',
        '📅 Browse upcoming events open for registration',
        '🎫 Register and receive digital QR tickets',
        '📱 Manage personal tickets — view, cancel',
        '🏢 Organizer dashboard: create, publish, cancel events; manage ticket types',
        '🔍 Camera-based check-in: scan and validate QR at the door',
        '⏰ Email reminders 24h and 1h before events',
        '🌐 Bilingual UI: Vietnamese / English',
      ],
    },
    attendeeGuide: {
      heading: 'Attendee Guide',
      steps: [
        'Visit /events to browse the event list',
        'Select an event and click "Register"',
        'Receive your QR code immediately',
        'Go to /tickets to view and manage your tickets',
      ],
    },
    organizerGuide: {
      heading: 'Organizer Guide',
      steps: [
        'Visit /organizer after signing in',
        'Click "+ Create Event" to create a new event',
        'Add ticket types and publish the event',
        'Open the check-in page to scan attendees\' QR codes',
      ],
    },
    devSetup: {
      heading: 'Development Setup',
    },
  },
}

type Lang = 'vi' | 'en'

export default async function DocsPage() {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value ?? 'vi') as Lang
  const lang: Lang = locale === 'en' ? 'en' : 'vi'
  const c = content[lang]
  const accounts = demoAccounts[lang]

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
        {/* Demo Accounts */}
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-800">{c.demoTitle}</h2>
          <p className="mb-4 text-sm text-gray-500">
            {c.demoHint} <span className="font-medium text-indigo-600">{c.loginHint}</span>
          </p>
          <DemoAccounts accounts={accounts} />
        </section>

        {/* Features */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">{c.features.heading}</h2>
          <ul className="space-y-2">
            {c.features.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Attendee Guide */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">{c.attendeeGuide.heading}</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            {c.attendeeGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        {/* Organizer Guide */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">{c.organizerGuide.heading}</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            {c.organizerGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        {/* Dev Setup */}
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-800">{c.devSetup.heading}</h2>
          <div className="space-y-3">
            <TerminalBlock command="git clone <repo-url> && cd event-management" />
            <TerminalBlock command="pnpm install" />
            <TerminalBlock command="cp .env.example .env.local" />
            <TerminalBlock command="pnpm next dev -p 3005" />
          </div>
        </section>
      </div>
    </main>
  )
}
