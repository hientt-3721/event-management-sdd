'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const parsed = emailLoginSchema.safeParse({ email, password })
  if (!parsed.success) return { error: 'VALIDATION_ERROR' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) return { error: 'INVALID_CREDENTIALS' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()
  const role = (profile as { role: string } | null)?.role

  if (role === 'organizer' || role === 'staff') {
    redirect('/organizer')
  }
  redirect('/events')
}
