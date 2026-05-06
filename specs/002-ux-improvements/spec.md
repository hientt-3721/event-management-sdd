# Feature Specification: UX Improvements — Real-time Updates, Full i18n, Email/Password Auth & Docs Redesign

**Feature Branch**: `002-ux-improvements`
**Created**: 2026-05-05
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ticket Count Updates Instantly After Check-in or Cancellation (Priority: P1)

An organizer or attendee should see ticket counts and statuses update immediately after a check-in or ticket cancellation — without needing to manually refresh the page. Currently, the `checkInTicket` and `cancelTicket` server actions do not call `revalidatePath`, so the Next.js data cache is never invalidated and the UI shows stale data until a hard reload.

**Why this priority**: This is a live data correctness bug. If check-in staff see stale counts, they cannot trust the system on event day. It directly undermines the core value of the application.

**Independent Test**: Can be fully tested by registering a ticket for an event, navigating to the event detail page (note the ticket count), cancelling the ticket, and verifying the count changes without a manual page refresh.

**Acceptance Scenarios**:

1. **Given** a published event has 5 active tickets, **When** an attendee cancels their ticket, **Then** the event detail page (attendee and organizer views) reflects the updated ticket count without requiring a page reload.
2. **Given** a check-in staff member scans a valid QR code on the check-in page, **When** check-in succeeds, **Then** the organizer event detail page (attendee count) reflects the new used count on next visit without requiring a manual hard refresh.
3. **Given** an attendee registers for an event, **When** registration succeeds, **Then** the event detail page shows the updated remaining ticket count.
4. **Given** a ticket is cancelled, **When** the attendee visits "My Tickets", **Then** the cancelled ticket displays "Đã huỷ / Cancelled" status immediately.

### Edge Cases

- Cancellation of an already-cancelled ticket must return an error rather than double-decrementing counts.
- Check-in of an already-used ticket must not alter counts but must still show the correct stale-data-free status to all viewers.

---

### User Story 2 — Full App i18n: Vietnamese and English Throughout (Priority: P2)

Currently, Vietnamese/English language switching only applies to the `/docs` page. All other pages (events, tickets, organizer dashboard, check-in, login, home) are hard-coded in Vietnamese. The app should support full language switching — users can toggle between Vietnamese and English across the entire application, with the preference persisted.

**Why this priority**: The docs already advertise bilingual support. Inconsistency between docs and actual UI degrades user trust and limits reach to non-Vietnamese users.

**Independent Test**: Can be tested by switching language to English on any page and verifying that all user-facing text on that page renders in English. Switching back to Vietnamese should restore all text.

**Acceptance Scenarios**:

1. **Given** a user is on any page of the app, **When** they switch the language toggle to English, **Then** all navigation labels, buttons, headings, and messages on the current page display in English.
2. **Given** a user sets the language to English, **When** they navigate to another page, **Then** the language preference is remembered and the new page renders in English.
3. **Given** a user is on the organizer dashboard in English mode, **When** they view event status badges, error messages, and form labels, **Then** all text is in English.
4. **Given** a user is on the check-in page in English mode, **When** they scan a ticket and receive a result (valid / already used / cancelled / not found), **Then** the result message is displayed in English.
5. **Given** the app defaults to Vietnamese, **When** a first-time user visits, **Then** the interface is in Vietnamese.

### Edge Cases

- Date/time formatting must be locale-aware (Vietnamese: `dd/MM/yyyy`, English: `MM/dd/yyyy` or ISO).
- Language preference must survive page reload (cookie or localStorage).
- Email notifications generated server-side are exempt from client-side language toggle and remain in Vietnamese for now.

---

### User Story 3 — Email/Password Login with Pre-shared Demo Accounts (Priority: P3)

Currently the only login method is Google OAuth. A second login method — email + password — must be added to allow demo/test users to log in without a Google account. Two pre-configured demo accounts (one attendee, one organizer) should be documented and accessible, enabling anyone evaluating the app to experience both roles immediately.

**Why this priority**: Google OAuth requires a real Google account and specific OAuth redirect configuration per environment. Demo accounts with email/password allow evaluators, stakeholders, and reviewers to access the app without credentials setup.

**Independent Test**: Can be tested by opening the login page, selecting "Sign in with email", entering the demo attendee credentials, and verifying successful login with redirect to the events page. Repeat with organizer credentials and verify redirect to organizer dashboard.

**Acceptance Scenarios**:

1. **Given** a visitor opens the login page, **When** they see the login form, **Then** both "Sign in with Google" and "Sign in with Email" options are visible.
2. **Given** a visitor selects "Sign in with Email", **When** they enter a valid email and password, **Then** they are authenticated and redirected based on their role.
3. **Given** a visitor enters an incorrect email or password, **When** they submit the form, **Then** a clear error message is shown ("Email or password is incorrect") and they remain on the login page.
4. **Given** the demo attendee account credentials are used, **When** login completes, **Then** the user is redirected to the events list as an attendee.
5. **Given** the demo organizer account credentials are used, **When** login completes, **Then** the user is redirected to the organizer dashboard.
6. **Given** a logged-in user, **When** they log out, **Then** both email/password and Google sessions are terminated correctly.

### Edge Cases

- Password field must mask input by default with a show/hide toggle.
- Login form must not expose whether an email address exists (generic error message for both wrong email and wrong password).
- Demo credentials must work on both local development and production (Vercel) deployments.

---

### User Story 4 — Professional Docs Page with Terminal Guides and Demo Credentials (Priority: P4)

The `/docs` page currently renders as a simple list of text sections with basic styling. It needs to be redesigned to look like the documentation of a professional developer tool — complete with a language switcher, terminal code blocks, copy buttons, quick-start guide with step-by-step commands, a demo accounts section with masked passwords, and a feature overview with icons.

**Why this priority**: The docs page is the entry point for evaluators and users who want to understand and try the app. A polished docs page signals quality and enables immediate hands-on exploration.

**Independent Test**: Can be tested by opening `/docs`, verifying the page has a sidebar/navigation, terminal-style code blocks with copy functionality, bilingual content toggle, and clearly visible demo account credentials.

**Acceptance Scenarios**:

1. **Given** a user opens `/docs` in Vietnamese, **When** the page renders, **Then** they see a professional layout with navigation sections, a language switcher, and terminal code blocks for setup commands.
2. **Given** a user clicks the language switcher on `/docs`, **When** they switch to English, **Then** all documentation text switches to English without page reload.
3. **Given** a user reads the "Demo Accounts" section, **When** the page renders, **Then** they can see the email and role for each account, and reveal the password with a toggle button.
4. **Given** a user reads the "Getting Started" section, **When** they see terminal commands, **Then** each command has a copy-to-clipboard button that copies the exact command on click.
5. **Given** a user visits on a mobile device, **When** the docs page renders, **Then** the layout is responsive — navigation collapses, code blocks scroll horizontally.

### Edge Cases

- Demo password reveal should use a client-side toggle (no server round-trip).
- Code blocks must preserve indentation and syntax in Vietnamese and English modes.

---

## Requirements *(mandatory)*

### Functional Requirements

**Real-time Cache Invalidation (Story 1)**

- **FR-001**: The `cancelTicket` server action MUST call `revalidatePath` for the cancelled ticket's event detail page and the attendee's tickets list after a successful cancellation.
- **FR-002**: The `checkInTicket` server action MUST call `revalidatePath` for the relevant event detail page after a successful check-in.
- **FR-003**: The `registerTicket` server action MUST call `revalidatePath` for the event detail page after a successful registration.
- **FR-004**: After cancellation, the `CancelTicketButton` MUST use `router.refresh()` in addition to `router.push('/tickets')` to ensure the destination page renders fresh data.

**Full App i18n (Story 2)**

- **FR-005**: All user-facing strings in every page and component MUST be extracted into `messages/vi.json` and `messages/en.json`.
- **FR-006**: A language switcher component MUST be available in the global site navigation (header), not just on the docs page.
- **FR-007**: The selected language MUST be persisted via a cookie so it survives page navigation and reload.
- **FR-008**: `next-intl` locale detection MUST be configured at the app level (middleware or `i18n/request.ts`) to read from the persisted cookie, falling back to `vi`.
- **FR-009**: Date and number formatting MUST use locale-appropriate patterns.

**Email/Password Login (Story 3)**

- **FR-010**: The login page MUST present an email input and a password input alongside the existing Google OAuth button.
- **FR-011**: Submitting valid credentials MUST authenticate the user and redirect them by role (attendee → `/events`, organizer/staff → `/organizer`).
- **FR-012**: Submitting invalid credentials MUST display a generic error message without revealing whether the email exists.
- **FR-013**: The password input MUST include a show/hide toggle button.
- **FR-014**: Two demo accounts (attendee and organizer) MUST be created in Supabase Auth and documented in `/docs`.

**Docs Redesign (Story 4)**

- **FR-015**: The `/docs` page MUST include a navigation sidebar (or top tabs on mobile) with anchor links to each major section.
- **FR-016**: Setup commands MUST be rendered in styled terminal code blocks with copy-to-clipboard buttons.
- **FR-017**: A "Demo Accounts" section MUST list each account's email, role, and a toggleable (reveal/hide) password field.
- **FR-018**: All documentation content MUST be available in both Vietnamese and English, toggled by the language switcher on the page.
- **FR-019**: The docs page MUST be responsive and usable on mobile viewports.

### Key Entities

- **Language Preference**: User-side cookie `NEXT_LOCALE` storing `vi` or `en`.
- **Demo Account**: A Supabase Auth user created with email/password, assigned a role (`attendee` or `organizer`) in the `profiles` table.
- **Server Action**: A Next.js server action that performs a database mutation and MUST call `revalidatePath` to invalidate the Next.js data cache for affected routes.

---

## Success Criteria *(mandatory)*

1. After cancelling a ticket, the ticket count on the event detail page changes within the same user session without a manual browser refresh.
2. After a successful check-in scan, the organizer event detail page shows the updated attendee count on the next page visit without requiring a hard reload.
3. Every page in the app — home, events list, event detail, my tickets, ticket detail, organizer dashboard, check-in — displays correctly in both Vietnamese and English.
4. Switching language on any page persists the preference for the entire browsing session including cross-page navigation.
5. A first-time user can log in using the demo attendee email/password and access the events list within 30 seconds of opening the login page.
6. A first-time user can log in using the demo organizer email/password and access the organizer dashboard within 30 seconds.
7. The `/docs` page includes terminal code blocks, a demo accounts section with toggleable passwords, and a bilingual language switcher — all rendered correctly on desktop and mobile.

---

## Assumptions *(mandatory)*

- `next-intl` is already installed (`package.json` confirms `next-intl 3.26.3`) — no additional package installation needed for i18n expansion.
- Demo accounts will be created manually in Supabase Auth Dashboard and their passwords documented in `specs/002-ux-improvements/spec.md` (local reference only; credentials in `.env.example` are placeholders).
- Supabase email/password auth is already enabled by default on the project — no additional Supabase configuration is required beyond creating the accounts.
- The `revalidatePath` fix is purely additive (no schema changes, no new dependencies) — it is a small targeted change with no risk of regressions in the existing auth or registration flows.
- Email notifications remain in Vietnamese only for now (out of scope for this iteration's i18n effort).
- The docs redesign is a frontend-only change to `src/app/docs/page.tsx` and related components — it does not require database changes.

---

## Out of Scope

- Real-time WebSocket / Supabase Realtime subscriptions for live push updates (the `revalidatePath` approach satisfies the stated requirement).
- Right-to-left (RTL) language support.
- More than two languages (only Vietnamese and English in this iteration).
- Email/password account self-registration (sign-up form) — only pre-configured demo accounts for now.
- Password reset flow for email/password accounts.
- Admin panel for creating user accounts via UI.
