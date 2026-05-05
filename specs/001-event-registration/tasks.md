# Tasks: Event Registration — Iteration 2 (UI Polish & Feature Gaps)

**Input**: Design documents from `specs/001-event-registration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅
**Branch**: `001-event-registration`
**Iteration**: 2 — Post-launch audit fixes

**Organization**: Tasks grouped by gap/story. Each phase is independently testable.

---

## Phase 1: Setup (Database & RLS)

**Purpose**: Fix the one RLS policy that blocks unauthenticated event browsing. Must complete before any UI work.

- [ ] T001 Update Supabase RLS — drop `"Published events visible to authenticated users"` policy and replace with `"Published events visible to all"` (no auth required for published events) via SQL Editor in Supabase Dashboard — see plan.md Gap 1 for exact SQL
- [ ] T002 Update `supabase/all_migrations.sql` to reflect the new policy so it stays in sync with cloud DB in `supabase/all_migrations.sql`

**Checkpoint**: Unauthenticated `curl https://oikzsbbkdbaenusarszq.supabase.co/rest/v1/events?status=eq.published` returns data (not empty array due to RLS block)

---

## Phase 2: Foundational (Auth Flow Correctness)

**Purpose**: Fix auth redirect logic — these are blocking correctness issues that affect every other story.

- [ ] T003 Fix `/login` page: add server-side `createClient()` auth check → `redirect('/events')` if already authenticated in `src/app/(auth)/login/page.tsx` ✅ DONE
- [ ] T004 Fix auth callback route: after PKCE exchange, read user's profile role → redirect `organizer`/`staff` to `/organizer`, `attendee` to `/events` in `src/app/auth/callback/route.ts`
- [ ] T005 Update `src/app/(attendee)/layout.tsx`: remove any events/* route guarding (events will move to public routes); keep only `/tickets` and `/tickets/[id]` auth-guarded

**Checkpoint**: Sign in with Google → organizer lands on `/organizer`, attendee lands on `/events`. Visiting `/login` while signed in → redirects to `/events`

---

## Phase 3: US1 — Public Event Browsing (Priority: P1) 🎯

**Goal**: Unauthenticated visitors can browse events; register button prompts login

**Independent Test**: Open http://localhost:3005/events in incognito → see event list. Click "Đăng ký" on any event → redirected to `/login?next=/events/[id]`

- [ ] T006 [US1] Create `src/app/events/page.tsx` — public event list page (copy from `(attendee)/events/page.tsx`, remove auth redirect, keep data fetching via `getPublishedEvents()`)
- [ ] T007 [US1] Create `src/app/events/[id]/page.tsx` — public event detail page (copy from `(attendee)/events/[id]/page.tsx`, make auth optional: show QR/registration UI only if user is logged in)
- [ ] T008 [US1] Update `src/components/events/register-button.tsx` — if user is `null`, render `<Link href="/login?next=/events/[id]">Đăng nhập để đăng ký</Link>` styled as the register button instead of the form
- [ ] T009 [US1] Delete or empty `src/app/(attendee)/events/` directory — remove the auth-gated versions of these pages to avoid duplicate routes
- [ ] T010 [P] [US1] Update all internal links in `src/components/events/event-card.tsx` and `src/components/events/event-list.tsx` to point to `/events/[id]` (not `/(attendee)/events/[id]` — these are the same URL, just verify no broken references)

**Checkpoint**: Incognito browser can browse `/events` and `/events/[id]` without login prompt

---

## Phase 4: US3 — Organizer Create & Edit Event (Priority: P3)

**Goal**: Organizer can create AND edit events; flow is discoverable from dashboard

**Independent Test**: Login as organizer → `/organizer` → create new event → fills form → saved as Draft → click Edit → change name → saved → name updated on detail page

- [ ] T011 [US3] Create `src/components/organizer/edit-event-form.tsx` — client component with pre-filled inputs (name, description, start_at, end_at, location) calling `updateEvent` Server Action, shows success/error feedback
- [ ] T012 [US3] Create `src/app/organizer/events/[id]/edit/page.tsx` — fetches event by ID (auth + ownership check), renders `EditEventForm` with event data pre-filled
- [ ] T013 [US3] Update `src/app/organizer/events/[id]/page.tsx` — add "✏️ Chỉnh sửa" button next to the "Huỷ sự kiện" action (visible for organizer role, not shown for cancelled events), links to `/organizer/events/[id]/edit`
- [ ] T014 [P] [US3] Update `src/app/organizer/events/new/page.tsx` — verify the create event form exists and works correctly; ensure it redirects to `/organizer/events/[id]` after creation (not just `/organizer`)

**Checkpoint**: Organizer can create a new event, is redirected to its detail page, and can edit it via the Edit button

---

## Phase 5: US4 — Check-in Scanner Discoverability (Priority: P4)

**Goal**: Staff/organizer can reach the scanner without knowing the event ID

**Independent Test**: Login as organizer → nav shows "Check-in" link → click → see list of published events → click one → scanner opens

- [ ] T015 [US4] Create `src/app/organizer/checkin/page.tsx` — lists all published events the organizer manages (or all published events for staff role); each row links to `/organizer/events/[id]/checkin`
- [ ] T016 [US4] Update `src/components/layout/site-nav.tsx` — add "🔍 Check-in" nav link visible only for `organizer`/`staff` roles, pointing to `/organizer/checkin`

**Checkpoint**: Staff user can navigate from nav → check-in index → select event → scanner without knowing URLs

---

## Phase 6: US5/US6 — Role-Differentiated UX & Landing Page (Priority: P2/P5)

**Goal**: Attendee and organizer see different home experiences; landing page is visually appealing

**Independent Test**: Open `/` as (a) unauthenticated, (b) attendee, (c) organizer — each sees different CTA. Page has gradient hero, not blank white.

- [ ] T017 [P] [US5] Create `src/components/layout/app-logo.tsx` — SVG component: ticket icon + "EventApp" wordmark in indigo, used in nav and potentially favicon
- [ ] T018 [US5] Update `src/components/layout/site-nav.tsx` — replace plain "EventApp" text link with `<AppLogo />` component
- [ ] T019 [US6] Rewrite `src/app/page.tsx` — rich landing page with:
  - Hero: gradient `from-indigo-50 to-white`, headline "Quản lý & tham dự sự kiện dễ dàng", role-aware CTA buttons
  - If unauthenticated: "Xem sự kiện" + "Đăng nhập"
  - If attendee: "Xem sự kiện" + "Vé của tôi"
  - If organizer: "Quản lý sự kiện" + "Tạo sự kiện mới"
  - Features grid (3 cards): Đăng ký nhanh, Vé QR điện tử, Check-in dễ dàng
- [ ] T020 [P] [US6] Update `src/app/globals.css` — add subtle `background-image` dot/grid pattern for main content area using CSS radial-gradient; keep white bg for cards
- [ ] T021 [P] [US6] Update `src/components/events/event-card.tsx` — when `banner_image_url` is null, render a gradient placeholder (`bg-gradient-to-br from-indigo-100 to-purple-100`) with an emoji icon centered instead of empty space

**Checkpoint**: Landing page shows hero + feature grid. Event cards with no banner show gradient placeholder instead of nothing.

---

## Phase 7: Polish & Cross-cutting

**Purpose**: Final cleanup ensuring consistency and no broken routes

- [ ] T022 [P] Verify `src/app/(attendee)/layout.tsx` only guards `/tickets` and `/tickets/[id]` — remove any reference to events routes
- [ ] T023 [P] Verify `src/middleware.ts` matcher patterns — ensure `/events` and `/events/[id]` are NOT in the auth-required matcher list
- [ ] T024 [P] Update `messages/vi.json` and `messages/en.json` — add translation keys for any new UI strings added in T011–T021 (edit form labels, check-in index page, landing page copy)
- [ ] T025 Add `public/favicon.ico` or `src/app/favicon.ico` — use a simple ticket emoji or generate a minimal SVG favicon based on the AppLogo design

---

## Dependencies (Story Completion Order)

```
T001 (RLS fix)
  └── T006–T010 (US1 public events) — needs RLS to allow unauth reads

T003–T005 (auth flow)
  └── T004 (role redirect) — needs T003 (login redirect) done first

T011–T014 (US3 organizer edit)
  └── T013 (edit button) — needs T011+T012 (form + page) done first

T015–T016 (US4 check-in index)
  └── T016 (nav link) — needs T015 (page) done first

T017–T021 (US5/6 visual)
  └── T018 (logo in nav) — needs T017 (logo component) done first
  └── T019 (landing) — standalone, no deps
```

## Parallel Execution Opportunities

**Phase 3 + Phase 4 can run in parallel** after Phase 1+2 are done:
- Developer A: T006–T010 (public events)
- Developer B: T011–T014 (edit event form)

**Phase 5 + Phase 6 can run in parallel** after Phase 3:
- Developer A: T015–T016 (check-in discoverability)
- Developer B: T017–T021 (logo + landing page)

**Within Phase 6**: T017, T020, T021 marked `[P]` — all touch different files, safe to do simultaneously.

---

## Implementation Strategy

**MVP scope**: Phase 1 + Phase 2 + Phase 3 (T001–T010)
→ Delivers: public event browsing, correct auth redirects, login-gated registration

**Full iteration 2**: All phases T001–T025
→ Delivers: all 6 gaps fixed + visual polish

**Suggested order for solo developer**:
1. T001–T002 (5 min — SQL in Dashboard)
2. T003–T005 (15 min — auth flow, T003 already done ✅)
3. T006–T010 (30 min — public events)
4. T011–T014 (45 min — edit form)
5. T015–T016 (20 min — check-in nav)
6. T017–T021 (60 min — visual polish)
7. T022–T025 (15 min — cleanup)

**Total estimate**: ~3 hours for full iteration 2
