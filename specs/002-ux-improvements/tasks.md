# Tasks: UX Improvements — Real-time Updates, Full i18n, Email/Password Auth & Docs Redesign

**Feature**: UX Improvements  
**Branch**: `002-ux-improvements`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Generated**: 2026-05-06

---

## Phase 1: Setup

> No project initialisation tasks needed — app already exists, no new packages required, no schema migrations.

---

## Phase 2: Foundational — Blocking Prerequisites

> These tasks must complete before any User Story phase begins. US2 i18n wiring depends on message keys existing; US3 login form depends on auth keys; US4 docs depends on LangSwitcher.

- [X] T001 Add all missing i18n message keys to messages/vi.json and messages/en.json (keys: auth.signInWithEmail, auth.emailLabel, auth.passwordLabel, auth.signIn, auth.signingIn, auth.showPassword, auth.hidePassword, auth.invalidCredentials, organizer.editEvent, organizer.addTicketType, organizer.attendees, organizer.noEvents, organizer.noEventsHint, tickets.cancelError, tickets.confirmCancelMessage, tickets.qrTitle — both languages)
- [X] T002 Create src/components/layout/lang-switcher.tsx (promote from src/components/docs/lang-switcher.tsx — same implementation, new path, `'use client'`, sets NEXT_LOCALE cookie, calls router.refresh())

---

## Phase 3: User Story 1 — Ticket Count Updates Instantly (P1)

**Story goal**: After any ticket mutation (register, cancel, check-in), the relevant pages show updated data on the next visit without a manual browser refresh.

**Independent test criteria**: Register a ticket → note event's ticket count on `/events/[id]` → cancel the ticket → revisit `/events/[id]` → count decrements automatically. Repeat with check-in: scan a ticket → visit `/organizer/events/[id]` → attendee count increments.

- [X] T003 [P] [US1] Update registerTicket in src/features/tickets/actions.ts — after successful RPC, fetch event_id from ticket_types and call revalidatePath(`/events/${eventId}`)
- [X] T004 [P] [US1] Update cancelTicket in src/features/tickets/actions.ts — add event_id to the select query (.select('attendee_id, status, ticket_types(event_id, events(start_at))')), then after successful UPDATE call revalidatePath for /events/${eventId}, /tickets, and /tickets/${ticketId}
- [X] T005 [P] [US1] Update checkInTicket in src/features/checkin/actions.ts — after RPC returns status 'valid', query tickets.ticket_types(event_id) and call revalidatePath(`/organizer/events/${eventId}`)
- [X] T006 [US1] Add router.refresh() before router.push('/tickets') in src/components/tickets/cancel-ticket-button.tsx so the destination page renders fresh data in the same browser session

---

## Phase 4: User Story 2 — Full App i18n (P2)

**Story goal**: Every user-facing string in every page and component is driven by next-intl messages. Language toggle is available in the global navigation and persists across page navigation.

**Independent test criteria**: Open any page → click language toggle to English in the nav → all text on the current page renders in English → navigate to another page → English is preserved.

- [X] T007 [US2] Update src/components/layout/site-nav.tsx — import getTranslations('nav') server-side, replace all hardcoded Vietnamese strings with t('key'), read NEXT_LOCALE cookie, render <LangSwitcher currentLang={locale} /> in the nav
- [X] T008 [P] [US2] Update src/app/page.tsx — import getTranslations('home') and replace all hardcoded strings with t('key')
- [X] T009 [P] [US2] Update src/app/events/page.tsx — import getTranslations('events') and replace title and subtitle strings with t('key')
- [X] T010 [P] [US2] Update src/components/events/event-list.tsx — import useTranslations('events') and replace empty state strings with t('empty') and t('emptyHint')
- [X] T011 [P] [US2] Update src/components/events/event-card.tsx — import useTranslations('events') and replace hardcoded button labels and ticket count strings with t('key')
- [X] T012 [P] [US2] Update src/components/events/register-button.tsx — import useTranslations('events') and replace all hardcoded strings (register, soldOut, registerSuccess, qrInstructions, close, ticketTypes, registering) with t('key')
- [X] T013 [P] [US2] Update src/app/(attendee)/tickets/page.tsx — import getTranslations('tickets') and replace title, subtitle, empty state strings with t('key')
- [X] T014 [P] [US2] Update src/app/(attendee)/tickets/[id]/page.tsx — import getTranslations('tickets') and replace all labels, status badge text, and button labels with t('key')
- [X] T015 [P] [US2] Update src/components/tickets/cancel-ticket-button.tsx — import useTranslations('tickets') and replace "Huỷ vé", "Xác nhận huỷ", "Quay lại", error message, and confirmation message with t('key')
- [X] T016 [P] [US2] Update src/components/tickets/ticket-card.tsx — import useTranslations('tickets') and replace hardcoded status labels and button text with t('key')
- [X] T017 [P] [US2] Update src/components/checkin/check-in-scanner.tsx — import useTranslations('checkin') and replace all status messages (valid, already_used, cancelled, not_found, error) and "Quét vé tiếp theo" with t('key')
- [X] T018 [P] [US2] Update src/app/organizer/page.tsx — import getTranslations('organizer') and replace title, subtitle, and all hardcoded strings with t('key')
- [X] T019 [P] [US2] Update src/app/organizer/events/[id]/page.tsx — import getTranslations('organizer') and replace status map, button labels, and heading text with t('key')
- [X] T020 [P] [US2] Update src/app/organizer/events/new/page.tsx — import getTranslations('organizer') and replace all form labels and heading with t('key')
- [X] T021 [P] [US2] Update src/app/organizer/events/[id]/edit/page.tsx — import getTranslations('organizer') and replace all form labels and heading with t('key')
- [X] T022 [P] [US2] Update src/app/organizer/events/[id]/checkin/page.tsx — import getTranslations('checkin') and replace title and subtitle with t('key')
- [X] T023 [P] [US2] Update src/app/(auth)/login/page.tsx — import getTranslations('auth') and replace title, subtitle, Google button label, and error message with t('key')

---

## Phase 5: User Story 3 — Email/Password Login with Demo Accounts (P3)

**Story goal**: Users can sign in with email + password. Two demo accounts (attendee + organizer) are available and documented. Login errors are generic (no user enumeration).

**Independent test criteria**: Open /login → click "Sign in with Email" → enter demo@attendee.com / Demo1234! → redirected to /events. Repeat with demo@organizer.com → redirected to /organizer. Enter wrong credentials → generic error shown, stay on login page.

- [X] T024 [US3] Add signInWithEmail server action to src/features/auth/actions.ts — validate email/password with zod, call supabase.auth.signInWithPassword, on error return { data: null, error: 'INVALID_CREDENTIALS' }, on success fetch profiles.role and redirect('/organizer') for organizer/staff or redirect('/events') for attendee
- [X] T025 [US3] Update src/app/(auth)/login/page.tsx — add LoginForm Client Component (co-located or in _components/) with email input, password input (type=password with show/hide toggle using eye icon), submit handler calling signInWithEmail, error display using t('auth.invalidCredentials'), and Google button unchanged; server shell keeps auth-redirect check

---

## Phase 6: User Story 4 — Professional Docs Page (P4)

**Story goal**: /docs renders as a professional documentation page with sticky sidebar navigation, terminal code blocks with copy buttons, bilingual language switcher, and a demo accounts section with toggleable passwords.

**Independent test criteria**: Open /docs → see two-column layout (sidebar + content) on desktop → click language toggle → all text switches to English → click a terminal block copy button → command is copied to clipboard → see demo accounts section with password reveal toggle → resize to mobile → sidebar collapses to horizontal tabs, code blocks scroll horizontally.

- [X] T026 [P] [US4] Create src/components/docs/terminal-block.tsx — 'use client', dark bg (bg-gray-950) with green text (text-emerald-400), language label badge, copy icon button top-right using navigator.clipboard.writeText(code), shows "✓ Copied" for 2 seconds then resets, horizontal scroll for long commands
- [X] T027 [P] [US4] Create src/components/docs/demo-accounts.tsx — 'use client', two account cards (attendee + organizer), email and role always visible, password masked by default (type=password), eye-icon toggle reveals/hides password, copy email button on each card, accepts lang prop for bilingual labels
- [X] T028 [P] [US4] Create src/components/docs/docs-nav.tsx — 'use client', accepts sections array and currentLang, desktop: sticky vertical sidebar with anchor links, mobile: horizontal scrollable tab bar, renders LangSwitcher in sidebar header
- [X] T029 [US4] Rewrite src/app/docs/page.tsx (depends on T026, T027, T028) — Server Component reads NEXT_LOCALE cookie, two-column desktop layout (sticky 240px sidebar + scrollable content area), sections: Introduction, Features, Quick Start (with TerminalBlock commands: git clone, pnpm install, cp .env.example, pnpm next dev), Demo Accounts (DemoAccounts component), Tech Stack, FAQ, fully bilingual vi/en content

---

## Phase 7: Polish & Cross-cutting Concerns

- [X] T030 Run pnpm next build and resolve any TypeScript strict mode errors introduced by the changes in this iteration (common: implicit any on translated strings, missing types for new action return types)
- [X] T031 Manually verify /docs responsive layout at 375px (mobile), 768px (tablet), and 1280px (desktop) — sidebar must collapse on mobile, terminal blocks must scroll horizontally, demo account cards must stack vertically on mobile

---

## Dependencies

```
T001 → T007, T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, T019, T020, T021, T022, T023 (message keys before wiring)
T002 → T007 (LangSwitcher component before SiteNav uses it)
T024 → T025 (signInWithEmail action before login form calls it)
T026, T027, T028 → T029 (new docs components before page rewrite)
All T003–T029 → T030 (build check after all changes)
T029 → T031 (docs page must exist before responsive check)
```

### User Story Completion Order (by priority)
```
US1 (T003–T006)  →  independent, fix first
US2 (T007–T023)  →  depends on T001, T002
US3 (T024–T025)  →  depends on T001 (auth message keys)
US4 (T026–T029)  →  independent of US1–US3
```

---

## Parallel Execution Examples

### US1 — can run T003, T004, T005 in parallel (different files)
```
T003 (tickets/actions.ts - registerTicket)
T004 (tickets/actions.ts - cancelTicket)    ← same file as T003, run sequentially
T005 (checkin/actions.ts - checkInTicket)  ← different file, parallel with T003/T004
T006 (cancel-ticket-button.tsx)            ← parallel with T005
```

### US2 — T008–T023 all touch different files, fully parallel after T001+T002+T007
```
T008 (page.tsx)              ─┐
T009 (events/page.tsx)        │
T010 (event-list.tsx)         │
T011 (event-card.tsx)         │ All parallel
T012 (register-button.tsx)    │ (different files)
T013 (tickets/page.tsx)       │
T014 (tickets/[id]/page.tsx)  │
T015 (cancel-ticket-button)   │
T016 (ticket-card.tsx)       ─┘
... etc
```

### US4 — T026, T027, T028 fully parallel (new files)

---

## Implementation Strategy

**MVP scope (immediate value)**: Complete US1 (T003–T006) first — 4 tasks, fixes the live data correctness bug. This is independently testable and deployable.

**Incremental delivery**:
1. Deploy US1 fix → confirm stale UI is resolved in production
2. Complete US2 (i18n) → language switcher appears globally, all strings translated
3. Complete US3 (email login) → demo accounts usable for stakeholder review
4. Complete US4 (docs) → professional documentation page live

**Task count summary**:
| Phase | Tasks | Story |
|-------|-------|-------|
| Foundational | 2 | — |
| Phase 3 | 4 | US1 (P1) |
| Phase 4 | 17 | US2 (P2) |
| Phase 5 | 2 | US3 (P3) |
| Phase 6 | 4 | US4 (P4) |
| Polish | 2 | — |
| **Total** | **31** | |
