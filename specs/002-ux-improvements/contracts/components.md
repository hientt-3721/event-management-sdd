# Component Contracts: UX Improvements

**Feature Branch**: `002-ux-improvements`
**Date**: 2026-05-05

---

## `LangSwitcher` (moved & promoted to global)

**New path**: `src/components/layout/lang-switcher.tsx`
**Old path**: `src/components/docs/lang-switcher.tsx` (deprecated — remove after migration)

```typescript
interface LangSwitcherProps {
  currentLang: 'vi' | 'en'
}
export function LangSwitcher({ currentLang }: LangSwitcherProps): JSX.Element
```

- **Client component** (`'use client'`)
- Sets `NEXT_LOCALE` cookie via `document.cookie` on click
- Calls `router.refresh()` to trigger server re-render with new locale
- No props changes from current implementation

---

## `SiteNav` (modified)

**Path**: `src/components/layout/site-nav.tsx`

**Changes**:
- Read `NEXT_LOCALE` cookie server-side and pass as `currentLang` to `LangSwitcher`
- Replace all hardcoded Vietnamese strings with `await getTranslations('nav')`
- Add `<LangSwitcher currentLang={locale} />` in the right side of the nav

**Locale reading** (server component):
```typescript
import { cookies } from 'next/headers'
const cookieStore = await cookies()
const locale = (cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'vi') as 'vi' | 'en'
```

---

## `TerminalBlock` (new)

**Path**: `src/components/docs/terminal-block.tsx`

```typescript
interface TerminalBlockProps {
  code: string      // the command/code to display
  language?: string // e.g. 'bash', 'sql' — for label display only
}
export function TerminalBlock({ code, language }: TerminalBlockProps): JSX.Element
```

- **Client component** (`'use client'`)
- Dark background (`bg-gray-900 text-green-400`)
- Copy button triggers `navigator.clipboard.writeText(code)`
- Button shows "Copied!" for 2 seconds after click, then resets

---

## `DemoAccounts` (new)

**Path**: `src/components/docs/demo-accounts.tsx`

```typescript
interface Account {
  email: string
  role: 'Attendee' | 'Organizer'
  roleVi: 'Người tham dự' | 'Ban tổ chức'
  password: string
}

interface DemoAccountsProps {
  lang: 'vi' | 'en'
}
export function DemoAccounts({ lang }: DemoAccountsProps): JSX.Element
```

- **Client component** (`'use client'`)
- Renders two account cards
- Password field: `type="password"` initially, toggleable to `type="text"` with eye icon
- Each card has a copy button for the email

---

## `DocsNav` (new)

**Path**: `src/components/docs/docs-nav.tsx`

```typescript
interface NavSection {
  id: string
  label: string
}

interface DocsNavProps {
  sections: NavSection[]
  lang: 'vi' | 'en'
  currentLang: 'vi' | 'en'
}
export function DocsNav({ sections, lang, currentLang }: DocsNavProps): JSX.Element
```

- **Client component** (`'use client'`)
- Desktop: sticky vertical sidebar with anchor links
- Mobile: horizontal scrollable tab bar
- Active section highlighting via `IntersectionObserver` (optional, P2 polish)
- Renders `LangSwitcher` inside the sidebar header

---

## Login Page (converted to Client Component)

**Path**: `src/app/(auth)/login/page.tsx`

**Architecture change**: Page converts to `'use client'` with a wrapper that handles form state. Auth redirect check (currently server-side) moves to the `useEffect` or remains as a separate server check.

**Alternative considered**: Keep server layout with a child client `LoginForm` component. This is the cleaner approach:
- `login/page.tsx` — Server Component: checks auth redirect, passes `searchParams`
- `login/_components/login-form.tsx` — Client Component: email/password form + Google button

**State**:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPassword, setShowPassword] = useState(false)
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
const [mode, setMode] = useState<'google' | 'email'>('google')
```

**Submit handler**:
```typescript
async function handleEmailSubmit(e: FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError(null)
  const result = await signInWithEmail(email, password)
  if (result.error) {
    setError(t('auth.invalidCredentials'))
  }
  // On success, signInWithEmail server action calls redirect() — page navigates
  setLoading(false)
}
```
