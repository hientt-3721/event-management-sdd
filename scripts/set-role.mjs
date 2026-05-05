#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/set-role.mjs <email> <role>
 *
 * Roles: attendee | organizer | staff
 *
 * Examples:
 *   node scripts/set-role.mjs hien@example.com organizer
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

const [, , emailArg, role] = process.argv
const VALID_ROLES = ['attendee', 'organizer', 'staff']

if (!emailArg || !role) {
  console.error('Usage: node scripts/set-role.mjs <email> <role>')
  process.exit(1)
}

if (!VALID_ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`)
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers, ...options })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`)
  return json
}

async function main() {
  // List all auth users to find by email
  const { users } = await apiFetch('/auth/v1/admin/users?per_page=200', {
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

  const found = users.find((u) => u.email === emailArg)
  if (!found) {
    console.error(`No user found with email: ${emailArg}`)
    console.log('\nAvailable accounts:')
    users.forEach((u) => console.log(`  ${u.email}`))
    process.exit(1)
  }

  const userId = found.id
  console.log(`Found user: ${found.email} (${userId})`)

  // Update profile role via PostgREST
  await apiFetch(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { ...headers, 'Prefer': 'return=representation' },
  })

  // Verify
  const [profile] = await apiFetch(`/rest/v1/profiles?id=eq.${userId}&select=id,display_name,role`)

  console.log(`✓ Role updated successfully!`)
  console.log(`  Name: ${profile?.display_name}`)
  console.log(`  ID:   ${profile?.id}`)
  console.log(`  Role: ${profile?.role}`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})

