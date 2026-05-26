# POST-AUGUST BACKLOG

Items deferred from the August 2026 classroom deployment. Not blocking launch.

## Auth & Roles
- Workspace switcher UI — users with multiple memberships always default to owned workspace
- Dashboard student-view filtering — students see workspace's full dashboard widgets
- `.single()` audit pass — 70% of Tier 1 bugs traced to `.single()` returning null on multi-row queries
- Booth renter product visibility refinement — current setup fully isolates; revisit one-way share

## Testing
- 13 pre-existing test failures in `team.test.ts`
- Verify `stylist_specialties` RLS policies in production once there's real data

## Theming & Config
- White-label theming consumption pass — 129 files with hardcoded hex values
- Mark `KERNEL_API_KEY`, `CRON_SECRET`, `KERNEL_WEBHOOK_SECRET` as Sensitive in Vercel
- HomeDashboard.tsx theming swaps reverted on 2026-05-25 — if intentional, redo deliberately

## Features
- Color cost tracking (Vish/SalonScale replacement)
- Build Bible §8.4 Formula Portability & Consent
- Build Bible §8.5 Opélle Community Layer
- Full Mevo replacement for Avenue Academy

## Promoted to August-Critical (see Tier 2.5 in build packet)
- Instructor approval queue UI
- `pending_client_joins` migration (006b) — apply before any client portal flow ships
