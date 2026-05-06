# Research: UX Improvements — Real-time Updates, Full i18n, Email/Password Auth & Docs Redesign

**Feature Branch**: `002-ux-improvements`
**Date**: 2026-05-05
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Stale UI After Check-in / Cancellation

### Root Cause (confirmed by code audit)

Three server actions mutate database state but **never call `revalidatePath`**, so Next.js serves the previous static render from cache until a hard browser reload:

| File | Action | Missing revalidation |
|------|--------|---------------------|
| `src/features/tickets/actions.ts` | `registerTicket` | No `revalidatePath` after INSERT |
| `src/features/tickets/actions.ts` | `cancelTicket` | No `revalidatePath` after UPDATE |
| `src/features/checkin/actions.ts` | `checkInTicket` | No `revalidatePath` after RPC check-in |

Additionally, `CancelTicketButton` calls `router.push('/tickets')` after cancellation. Because the `/tickets` route is not revalidated, Next.js serves the cached version of the page.

### Decision
- Add `revalidatePath` calls inside each action after the successful mutation.
- Add `router.refresh()` inside `CancelTicketButton` before `router.push` so the destination page gets fresh data.

### Paths to revalidate

| Action | Paths to revalidate |
|--------|-------------------|
| `registerTicket` | `/events/[eventId]` (ticket count changes) |
| `cancelTicket` | `/events/[eventId]`, `/tickets`, `/tickets/[ticketId]` |
| `checkInTicket` | `/organizer/events/[eventId]` (attendee count changes) |

**Deriving `eventId` from `ticketTypeId` / `ticketId`**: The actions already fetch the ticket/ticket_type record from the database — the event ID is available in the same query result. For `registerTicket`, a second query is needed to get `event_id` from `ticket_types`. For `cancelTicket`, the existing query already joins `ticket_types(event_id)`. For `checkInTicket`, the RPC returns the ticket record which includes enough info.

### Rationale
`revalidatePath` is the correct Next.js 14 App Router primitive for on-demand cache invalidation after a mutation. It invalidates the cached RSC (React Server Component) payload for the given path so the next request renders fresh data. No WebSocket/Realtime subscription is needed to satisfy the stated requirement.

### Alternatives Considered
- **Supabase Realtime subscription**: Would push updates to all connected clients in real time, but adds significant complexity (client-side subscription management, reconnect logic). Out of scope per spec.
- **`revalidateTag`**: Tag-based invalidation is more granular but requires tagging every `fetch` call at the data layer. Overkill for this codebase which uses Supabase SDK (not `fetch`). `revalidatePath` is simpler and sufficient.
- **`router.refresh()` only (no `revalidatePath`)**: Refreshes the current route for the current user only. Does not invalidate the server cache for other visitors. Insufficient for the organizer event detail page.

---

## 2. Full App i18n (next-intl)

### Current State (confirmed by code audit)

- `next-intl 3.26.3` is installed ✅
- `next.config.mjs` uses `createNextIntlPlugin` ✅
- `src/i18n/request.ts` reads `NEXT_LOCALE` cookie and falls back to `vi` ✅
- `messages/vi.json` and `messages/en.json` both exist with keys for: `nav`, `home`, `events`, `tickets`, `organizer`, `checkin`, `auth`, `errors` ✅
- `LangSwitcher` component exists in `src/components/docs/lang-switcher.tsx` ✅
- **BUT**: No component uses `useTranslations` — all strings are hardcoded in Vietnamese ❌

### Components with hardcoded strings (full list)

| Component/Page | Hardcoded strings |
|---|---|
| `src/components/layout/site-nav.tsx` | "Sự kiện", "Vé của tôi", "Ban tổ chức", "Đăng xuất", "Đăng nhập" |
| `src/app/page.tsx` | Title, subtitle, CTA labels, feature card text |
| `src/app/events/page.tsx` | "Sự kiện", subtitle |
| `src/components/events/event-list.tsx` | Empty state text |
| `src/components/events/register-button.tsx` | "Đăng ký tham dự", "Hết vé", modal text |
| `src/app/(attendee)/tickets/page.tsx` | "Vé của tôi", subtitle, empty state |
| `src/app/(attendee)/tickets/[id]/page.tsx` | Labels, status badges, "Huỷ vé" |
| `src/components/tickets/cancel-ticket-button.tsx` | "Huỷ vé", "Xác nhận huỷ", "Quay lại" |
| `src/components/checkin/check-in-scanner.tsx` | Status messages, "Quét vé tiếp theo" |
| `src/app/(auth)/login/page.tsx` | "Chào mừng!", subtitle |
| `src/app/organizer/page.tsx` | Organizer dashboard text |
| `src/app/organizer/events/[id]/page.tsx` | Status labels, button text |
| `src/app/organizer/events/new/page.tsx` | Form labels |
| `src/app/organizer/events/[id]/edit/page.tsx` | Form labels |
| `src/app/organizer/events/[id]/checkin/page.tsx` | "Check-in", subtitle |

### Decision
- Wire `useTranslations` (client components) and `getTranslations` (server components/actions) to every component listed above, using the already-defined message keys.
- Move `LangSwitcher` from `src/components/docs/` to `src/components/layout/` and render it inside `SiteNav`.
- Add missing translation keys for organizer form fields, ticket detail labels, and any other strings not yet in `messages/*.json`.
- `SiteNav` is a Server Component — it must pass the current locale down to `LangSwitcher` (a Client Component) via props.

### Rationale
`next-intl` is already fully wired at the infrastructure level. The only work needed is component-level adoption — replacing hardcoded strings with `t('key')` calls. No new packages, no config changes.

### Alternatives Considered
- **Replace next-intl with react-i18next**: Unnecessary — next-intl is already installed and configured for App Router with cookie-based locale detection.
- **Locale-based URL routing** (`/en/events`, `/vi/events`): next-intl supports this but it requires adding a locale segment to every URL. The current cookie-based approach (no URL prefix) is simpler and already implemented correctly — no change needed.

---

## 3. Email/Password Login

### Current State
- Supabase Auth is the auth provider ✅
- Google OAuth (PKCE flow) is the only login method ✅
- `src/features/auth/actions.ts` has `signIn()` (Google) and `signOut()` ✅
- `src/app/(auth)/login/page.tsx` renders a Google button only ✅
- Supabase email/password auth is enabled by default on all Supabase projects ✅

### Decision
- Add a `signInWithEmail(email: string, password: string)` server action to `src/features/auth/actions.ts`.
- Convert `src/app/(auth)/login/page.tsx` to a **Client Component** to handle the email form state (controlled input, show/hide password, error display) while keeping the Google button.
- Role-based redirect after login reuses the same `/auth/callback` logic for Google, but for email/password, redirect is handled directly in the `signInWithEmail` action (Supabase returns the session immediately, no PKCE redirect needed).
- Two demo accounts created in Supabase Auth Dashboard:
  - `demo@attendee.com` / `Demo1234!` — role: attendee
  - `demo@organizer.com` / `Demo1234!` — role: organizer

### Rationale
`supabase.auth.signInWithPassword` is the correct API for email/password auth. It does not require a redirect — the session is returned synchronously in the server action, and we can then redirect based on role. This is simpler than the PKCE OAuth flow.

Error messages use a generic "Email or password is incorrect" message regardless of whether the email exists, preventing user enumeration attacks (OWASP A07).

### Alternatives Considered
- **Magic link (passwordless email)**: Simpler UX but adds email deliverability dependency. Demo accounts need to work without email, so password login is more appropriate.
- **Keeping login page as Server Component**: Not possible — the email/password form requires controlled state (show/hide password, inline validation). Converting to Client Component is the correct approach.
- **Separate `/login/email` route**: Adds routing complexity for no benefit. A single unified login page with both methods is the better UX.

### Security Considerations
- The password field MUST use `type="password"` by default with a show/hide toggle.
- Brute force mitigation is handled by Supabase Auth's built-in rate limiting (no custom implementation needed).
- Demo passwords are intentionally simple (`Demo1234!`) but meet Supabase's minimum requirements (8+ chars, mixed case, number).
- Demo credentials are documented in `/docs` (public) — this is intentional for an evaluation/demo app.

---

## 4. Docs Page Redesign

### Current State
- `src/app/docs/page.tsx` is a 181-line Server Component
- Content is defined as an inline `const content = { vi: {...}, en: {...} }` object
- Sections: Overview, Key Features, Usage Guide, Tech Stack
- Language is read from cookie and passed to `LangSwitcher`
- No terminal code blocks, no copy buttons, no sidebar, no demo accounts section
- Basic Tailwind styling (prose-like text, no structured layout)

### Decision
Redesign `src/app/docs/page.tsx` with:
1. **Professional layout**: Two-column on desktop (sticky sidebar + content), single-column on mobile
2. **Terminal code blocks**: Dark-background `<pre>` blocks styled as terminals, with copy-to-clipboard using `navigator.clipboard.writeText`
3. **Demo accounts section**: Email + role shown, password toggleable with eye icon
4. **Anchor navigation**: Sidebar links use `href="#section-id"`, smooth scrolling
5. **Same language switching mechanism**: Cookie-based, `router.refresh()` after change
6. **Content sections**: Introduction, Features, Quick Start (with terminal commands), Demo Accounts, Tech Stack, FAQ

A dedicated `DocsLayout` client component handles copy-to-clipboard and password reveal (browser APIs). The main page remains a Server Component for initial data (locale reading).

### Rationale
The professional docs pattern (sidebar + main content + terminal blocks + demo credentials) matches well-known developer tools (Supabase, Vercel, shadcn/ui docs). It is achievable with pure Tailwind CSS and no additional docs framework.

### Alternatives Considered
- **Nextra / Fumadocs**: Full MDX docs framework. Overkill for a single-page docs site. Adds build complexity.
- **MDX files**: Better for large docs corpora. For a single bilingual page with dynamic content (copy buttons, password toggles), a React component is simpler.
- **Separate Vercel project for docs**: Over-engineered for a demo app with a single docs page.

---

## 5. Additional Missing Translation Keys

The following keys need to be added to `messages/vi.json` and `messages/en.json` for full i18n coverage:

```json
{
  "auth": {
    "signInWithEmail": "Đăng nhập bằng Email",
    "emailLabel": "Email",
    "passwordLabel": "Mật khẩu",
    "signIn": "Đăng nhập",
    "signingIn": "Đang đăng nhập...",
    "showPassword": "Hiện mật khẩu",
    "hidePassword": "Ẩn mật khẩu",
    "invalidCredentials": "Email hoặc mật khẩu không đúng."
  },
  "organizer": {
    "editEvent": "Chỉnh sửa",
    "addTicketType": "Thêm loại vé",
    "attendees": "người tham dự",
    "noEvents": "Chưa có sự kiện nào.",
    "noEventsHint": "Tạo sự kiện đầu tiên của bạn."
  },
  "tickets": {
    "cancelError": "Không thể huỷ vé. Vui lòng thử lại.",
    "confirmCancelMessage": "Bạn có chắc muốn huỷ vé này không?",
    "qrTitle": "Mã QR của bạn"
  }
}
```
