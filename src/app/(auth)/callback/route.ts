import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ''

  const safeNext =
    next.startsWith('/') && !next.startsWith('//') && !next.includes('://')
      ? next
      : null

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const response = NextResponse.redirect(`${origin}/events`)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  let destination = safeNext ?? '/events'

  if (!safeNext) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = (profile as { role: string } | null)?.role
      if (role === 'organizer' || role === 'staff') {
        destination = '/organizer'
      }
    }
  }

  response.headers.set('location', `${origin}${destination}`)
  return response
}
