import Link from 'next/link'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/features/auth/actions'
import { NavLink } from '@/components/layout/nav-link'
import { AppLogo } from '@/components/layout/app-logo'
import { LangSwitcher } from '@/components/layout/lang-switcher'

export async function SiteNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profileResult = user
    ? (await supabase.from('profiles').select('role, display_name').eq('id', user.id).single()).data
    : null
  const profile = profileResult as { role: string; display_name: string | null } | null

  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'vi') as 'vi' | 'en'
  const t = await getTranslations('nav')

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <AppLogo />
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <NavLink href="/events">{t('events')}</NavLink>
          {user && (
            <>
              <NavLink href="/tickets">{t('myTickets')}</NavLink>
              {profile && ['organizer', 'staff'].includes(profile.role) && (
                <>
                  <NavLink href="/organizer">{t('organizer')}</NavLink>
                  <NavLink href="/organizer/checkin">{t('checkin')}</NavLink>
                </>
              )}
              <form action={signOut}>
                <button type="submit" className="text-gray-500 hover:text-gray-800">{t('logout')}</button>
              </form>
            </>
          )}
          {!user && (
            <Link href="/login" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700 transition-colors">
              {t('login')}
            </Link>
          )}
          <NavLink href="/docs">{t('docs')}</NavLink>
          <LangSwitcher currentLang={locale} />
        </div>
      </div>
    </nav>
  )
}
