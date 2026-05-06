#!/usr/bin/env node
/**
 * Creates 2 demo accounts in Supabase Auth and sets their roles.
 *
 * Usage:
 *   node scripts/create-demo-accounts.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envVars = {}
try {
  readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) envVars[key.trim()] = rest.join('=').trim()
  })
} catch {
  console.error('Could not read .env.local')
  process.exit(1)
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers,
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`)
  return json
}

const DEMO_ACCOUNTS = [
  {
    email: 'demo@attendee.com',
    password: 'Demo1234!',
    display_name: 'Demo Attendee',
    role: 'attendee',
  },
  {
    email: 'demo@organizer.com',
    password: 'Demo1234!',
    display_name: 'Demo Organizer',
    role: 'organizer',
  },
]

async function createOrGetUser({ email, password, display_name }) {
  // Check if user already exists
  const { users } = await apiFetch('/auth/v1/admin/users?per_page=200')
  const existing = users.find((u) => u.email === email)

  if (existing) {
    console.log(`  ℹ User already exists: ${email} (${existing.id})`)

    // Update password in case it changed
    await apiFetch(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password, email_confirm: true }),
    })
    console.log(`  ✓ Password updated`)
    return existing.id
  }

  // Create new user (email_confirm: true skips confirmation email)
  const user = await apiFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: display_name },
    }),
  })

  console.log(`  ✓ Created user: ${email} (${user.id})`)
  return user.id
}

async function setProfile(userId, { display_name, role }) {
  // Upsert profile (trigger may have already created it)
  await apiFetch('/rest/v1/profiles', {
    method: 'POST',
    body: JSON.stringify({ id: userId, display_name, role }),
    headers: { 'Prefer': 'resolution=merge-duplicates' },
  })
  console.log(`  ✓ Profile set: display_name="${display_name}", role="${role}"`)
}

async function main() {
  console.log('Creating demo accounts...\n')

  for (const account of DEMO_ACCOUNTS) {
    console.log(`→ ${account.email}`)
    const userId = await createOrGetUser(account)
    await setProfile(userId, account)
    console.log()
  }

  console.log('Done! Demo accounts ready:')
  DEMO_ACCOUNTS.forEach(({ email, password, role }) => {
    console.log(`  ${email}  /  ${password}  (${role})`)
  })
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
