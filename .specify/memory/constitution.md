<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0  (initial constitution — no prior version)
Added sections:
  - Core Principles (I–VI)
  - Technology Stack
  - Development Workflow
  - Governance
Modified principles: N/A (initial authoring)
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ aligned (constitution gates reference Next.js / Supabase stack)
  - .specify/templates/spec-template.md  ✅ aligned (user stories reference responsive + TDD requirements)
  - .specify/templates/tasks-template.md ✅ aligned (test tasks are expected per TDD principle)
Deferred TODOs: none
-->

# Event Management Constitution

## Core Principles

### I. Clean Architecture & Separation of Concerns

Every module MUST have a single, well-defined responsibility.
Source code is organized as follows:

- `src/app/` — Next.js App Router pages and layouts (FE routes)
- `src/components/` — Reusable React components (pure UI, no data fetching)
- `src/features/` — Feature-scoped modules, each owning its own components,
  hooks, actions, and types
- `src/lib/` — Shared utilities, Supabase client, helpers
- `src/types/` — Global TypeScript type definitions
- `docs/` — Public documentation site (separate Next.js app or `/app/docs`)

Business logic MUST NOT leak into UI components. Server Actions and Route
Handlers are the only permitted data-access entry points from the client.

### II. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory across the entire codebase:

- Tests MUST be written and reviewed before any implementation code is authored.
- The Red-Green-Refactor cycle MUST be strictly observed.
- Unit tests cover pure functions, hooks, and utility modules.
- Integration tests cover Server Actions, API Route Handlers, and Supabase
  queries (using mocked or a local Supabase instance).
- E2E tests (Playwright) cover critical user journeys.
- No feature is considered complete until its tests pass in CI.

### III. Next.js Best Practices

The project MUST follow the official Next.js App Router conventions:

- Server Components by default; opt in to `"use client"` only when strictly
  necessary (event handlers, browser APIs, state).
- Data fetching happens in Server Components or Server Actions — never in
  client-side `useEffect` for initial data.
- Route Handlers (`app/api/`) are used only for webhook endpoints or third-party
  integrations; all other mutations use Server Actions.
- Image optimisation via `next/image`; font loading via `next/font`.
- Environment variables are validated at startup with a schema (e.g., `zod`).
- TypeScript strict mode is enabled at all times.

### IV. Supabase as the Single Backend

Supabase is the sole backend infrastructure:

- PostgreSQL (Supabase) is the single source of truth for all persistent data.
- Row Level Security (RLS) policies MUST be defined for every table — direct
  client access without RLS is forbidden.
- Authentication is handled exclusively by Supabase Auth (email/password + OAuth
  providers as needed).
- Storage for user-uploaded assets uses Supabase Storage buckets with appropriate
  bucket policies.
- Database migrations are managed via Supabase CLI (`supabase/migrations/`).
- The Supabase server-side client (`@supabase/ssr`) MUST be used in Server
  Components and Server Actions; the browser client is permitted only in
  Client Components where realtime subscriptions are required.

### V. Responsive Design with Bento Grid UI

The UI MUST be accessible and functional on all screen sizes (mobile-first):

- Layout primitives use a Bento Grid pattern: CSS Grid with named template areas,
  variable column spans, and fluid card sizes.
- Tailwind CSS is the styling tool; arbitrary values are discouraged — extend
  `tailwind.config.ts` instead.
- Every page MUST be visually tested at `375px`, `768px`, and `1280px` breakpoints
  before being considered complete.
- Animations and transitions MUST respect `prefers-reduced-motion`.
- Colour contrast MUST meet WCAG AA (4.5:1 for body text, 3:1 for large text).

### VI. Vercel-First Deployment & Documentation

The application MUST be deployable to Vercel with zero manual steps:

- `vercel.json` (or equivalent Next.js config) handles all build and routing
  configuration.
- Environment variables are managed via Vercel project settings; secrets MUST
  NOT be committed to the repository.
- A public documentation site (`/docs` sub-path or separate Vercel project) MUST
  be published alongside the application, introducing its purpose, features, and
  getting-started guide.
- Preview deployments are generated for every pull request.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + custom Bento Grid layout utilities |
| Backend / Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| ORM / Query builder | Supabase JS SDK (`@supabase/ssr`) |
| Testing — unit | Vitest + React Testing Library |
| Testing — E2E | Playwright |
| Deployment | Vercel (production + preview) |
| Documentation | Next.js MDX pages or Nextra, deployed to Vercel |
| CI | GitHub Actions |

## Development Workflow

1. **Spec first** — every feature starts with a spec (`/speckit.specify`).
2. **Plan** — implementation plan produced (`/speckit.plan`).
3. **Tests written** — failing tests authored before any implementation (`/speckit.tasks`).
4. **Implement** — code written to pass tests (`/speckit.implement`).
5. **Constitution check** — PR reviewer verifies all six principles are satisfied.
6. **Deploy** — merge to `main` triggers automatic Vercel deployment.
7. **Docs updated** — documentation site updated in the same PR when user-visible
   behaviour changes.

Pull requests MUST NOT be merged if:
- Any test is failing.
- RLS policies are absent for a new table.
- A new page has not been verified at the three required breakpoints.
- Environment variables are hard-coded.

## Governance

This constitution supersedes all other documented practices. Amendments require:

1. A written proposal describing the change and rationale.
2. Review and approval by the project lead.
3. A migration plan for any code that violates the updated principle.
4. A version bump following semantic versioning:
   - MAJOR — principle removal or backward-incompatible governance change.
   - MINOR — new principle or materially expanded guidance.
   - PATCH — clarification, wording, or typo fix.

All PRs and code reviews MUST verify compliance with this constitution.
Exceptions must be explicitly justified in the PR description and tracked as
technical debt.

**Version**: 1.0.0 | **Ratified**: 2026-05-05 | **Last Amended**: 2026-05-05
