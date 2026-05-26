# OPELLE AUDIT — AUGUST RESTART

**Audit date:** 2026-05-25
**Target deployment:** August 2026 (Belle's cosmetology classroom, live floor use + Calla for board prep)
**Working tree:** `/Users/anabellelord/Opelle/opelle-app-github`
**Scope:** Read-only audit. No changes were made to the repo. No prioritization, no plan — that comes after Belle reads this.

---

## 📌 EXECUTIVE SUMMARY

### Module counts (19 total per Belle's roadmap)
- **BUILT (12):** Modules 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 16
- **PARTIAL (5):** Modules 6 (Payroll), 9 (Team Management — see role gaps), 14 (Badges — DB+API, no UI), 15 (White-label theming — infra complete, plant-tokenization incomplete), 18 (Calla), 19 (Unified Service Flow)
- **SPEC ONLY (0)**
- **UNKNOWN / GAP (1):** Module 17 — no migration, no route, no Build Bible section. Numbering gap.

> Note: counts disagree slightly across the subagents that ran this audit. Where one agent called Module 18 "BUILT" based on file count and another called it "~40–50% complete" after a deep dive, the deeper finding is reflected above. Read Part 2 for the actual gaps.

### Critical-path features — ready vs not ready for August
| Feature | Status |
| --- | --- |
| CALLA (Module 18) | ⛔ NOT READY — quiz/flashcard/test submission APIs missing, no conversation persistence, NM regulatory content is thin (10 questions) |
| Unified Service Flow (Module 19) | ⚠️ PARTIAL — state machine + consultation + multi-process timers work; help UI not wired to API, inline photos not inside widget, feedback → translation engine chain is broken |
| Inspo-to-Formula (student-first new scope) | ⛔ NOT READY — currently requires `client_id`; needs DB nullable change, API/UI changes, retroactive-attach endpoint, AND four missing kernel endpoints |
| Role system (8 roles) | ⛔ NOT READY — only 6 of 8 roles defined; `assistant` and `booth_renter` not in permissions; `school_mode` does not exist anywhere in the codebase |
| Classroom schedule view | ⛔ NOT READY — no cohort/classroom data structure exists at all |
| Student E2E journey | ⚠️ PARTIAL — most middle steps work; signup-→-student-role is broken (every new user is inserted as `owner` in `workspace_members`) |

### THE SINGLE BIGGEST BLOCKER
**Four Metis kernel endpoints required by the inspo-to-formula flow are not implemented on the kernel side.** They are documented as missing in [docs/KERNEL-ENDPOINTS-NEEDED.md](opelle-app-github/docs/KERNEL-ENDPOINTS-NEEDED.md):
- `POST /api/v1/ai/analyze-inspo-vision` (60s)
- `POST /api/v1/ai/stylist-intelligence` (30s)
- `POST /api/v1/ai/appointment-flag` (15s)
- `POST /api/v1/ai/inspo-formula-suggestion` (30s)

Without these, the entire inspo consultation flow (Module 8.1–8.3) returns errors. Since the new student-first inspo feature is the highest-priority August add, this kernel work is the gating dependency for the most important new feature in the audit. Every other August blocker (Calla mode APIs, role fixes, classroom view, owner-role bug) is fixable inside the Opelle repo. This one is not.

---

# PART 1 — REPOSITORY HEALTH CHECK

## 1.1 Does the repo run locally?

| Check | Status | Evidence |
| --- | --- | --- |
| `node_modules` populated | ✅ Yes | 368 dirs, lockfile version 3 present |
| `npm install` would complete | ✅ Likely | Lockfile resolves; no known peer-dep conflicts in lockfile |
| Dev server boot env vars | ⚠️ Required | `.env.local` is populated; required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `KERNEL_API_URL`, `KERNEL_AUTH_KEY`, `KERNEL_ENABLED`, `KERNEL_WEBHOOK_SECRET` |
| Supabase connection | ✅ Configured | Browser client: [src/lib/supabase/client.ts](opelle-app-github/src/lib/supabase/client.ts) (`@supabase/ssr`). Server: [src/lib/supabase/server.ts](opelle-app-github/src/lib/supabase/server.ts). Admin: [src/lib/supabase/admin.ts](opelle-app-github/src/lib/supabase/admin.ts). Points at project `qccrfgkfcdcezxzdtfpk` |
| Most recent `next build` | ❌ FAILED | [build.log](opelle-app-github/build.log) (2026-04-07): network error `EAI_AGAIN registry.npmjs.org` downloading `@next/swc-linux-arm64-gnu`. **Not a code error** — environment/DNS. Build was not retried after restoration. |
| TypeScript strict | ✅ Yes | `tsconfig.json` strict: true. Zero `@ts-ignore` / `@ts-nocheck` in `src/` |
| Test suite | ✅ Present | 6 test files in `src/__tests__/` (inventory, utils, appointments, clients, team, permissions). No skips. |

### Dependency warnings
1. **`vi: ^0.3.2`** is listed in `devDependencies` in [package.json](opelle-app-github/package.json) — this is wrong. `vi` is a re-export from `vitest`, not a standalone package. Tests already import it correctly from `vitest`. The line is unused and should be removed at some point — **not breaking, but noise**.
2. **Next.js 16.1.1 + React 19.2.3 + Tailwind 4** — all on fresh majors. Belle has likely already absorbed the migration costs; just note that future deps will need to remain compatible.
3. Two npm advisory bumps are surfaced in the build log (npm 10.9.4 → 11.12.1). Cosmetic.

## 1.2 Build Bible vs reality — all 19 modules

The Build Bible at [opelle-build-bible.md](opelle-build-bible.md) canonically defines Modules 1–13. Modules 14–19 are extensions inferred from migration filenames and Belle's roadmap. Module 17 has **no migration, no route, no spec** — there is a numbering gap.

### Module 1 — Floor View (School) — ✅ BUILT
- UI: `src/app/app/floor/page.tsx` + `_components/`
- API: `src/app/api/floor/` (7 routes)
- DB: `floor_status` (migration `009`)
- No obvious rough edges.

### Module 2 — Hour Tracking (School) — ✅ BUILT
- UI: `src/app/app/hours/page.tsx`
- API: `src/app/api/hours/route.ts`
- DB: `time_entries`, `hour_totals` (migration `010`)

### Module 3 — Service Tracking / Curriculum — ✅ BUILT
- UI: `src/app/app/progress/page.tsx`
- API: `src/app/api/curriculum/`
- DB: `service_completions`, `curriculum_progress` (`011`)

### Module 4 — POS + Tip Tracking — ✅ BUILT
- UI: `src/app/app/checkout/page.tsx` + `CheckoutFlow.tsx`
- DB: `student_earnings` (`012`)
- Earnings recorded at checkout via `/api/earnings`.

### Module 5 — Inventory Management — ✅ BUILT
- UI: `src/app/app/products/` (6 components incl. predictions, alerts, quick-adjust, history)
- API: `src/app/api/inventory/` (7 handlers)
- DB: `color_lines`, `color_shades`, `shade_mappings`, `universal_color_profiles` (`013`)

### Module 6 — Payroll & Compensation — ⚠️ PARTIAL
- DB: `student_earnings` (`012`)
- API: `src/app/api/earnings/route.ts` records earnings (service + tip) at checkout
- **Missing:** dedicated payroll UI; pay-structure variants (hourly/commission/booth-rent/hybrid/splits); 1099/W-2 tax compliance; commission calculation engine. One subagent suggested payroll profiles + tax docs exist — on follow-up only the earnings recording path was verifiable. Treat as PARTIAL.

### Module 7 — Booking & Scheduling — ✅ BUILT
- UI: `src/app/app/appointments/` (11 files incl. V7Calendar, AppointmentsCalendar, pending, rebook)
- API: `src/app/api/appointments/`, `src/app/api/booking/`

### Module 8 — Client Portal & Journey — ✅ BUILT (with Build Bible drift)
- UI: `src/app/app/clients/` + `src/app/client/(portal)/`
- DB: `clients`, `client_invites`, `client_users`, `consents`, `intake_responses`, `aftercare_plans`, `rebook_requests`
- **Drift:** Build Bible 8.4 (Formula Portability & Consent) and 8.5 (Opélle Community Layer) are spec-only and not implemented. 8.5 is what migration 016 partially fills (network feeds), but the consent/sharing layer in 8.4 has zero code.

### Module 9 — Team Management — ⚠️ PARTIAL (role gaps)
- UI: `src/app/app/team/page.tsx` + 5 components (TeamList, InviteButton, InviteModal, RoleBadge, MemberEditDrawer)
- API: `src/app/api/admin/team/`
- **Hard gaps (see §2.4):**
  - Only 6 of 8 roles defined in [src/lib/permissions.ts](opelle-app-github/src/lib/permissions.ts) — `assistant` and `booth_renter` missing
  - `school_mode` flag is not defined or used anywhere in the codebase
  - Onboarding writes every new user to `workspace_members` with role `owner` (see §2.4 #5 and §2.6 step 1)

### Module 10 — Reporting & Analytics — ✅ BUILT
- UI: `src/app/app/reports/page.tsx` with 5 report tabs (Revenue, Services, Clients, Inventory, Hours) and components KPICard, DateRangePicker, ReportChart, ReportTable, ExportButton

### Module 11 — Marketing & Communications — ✅ BUILT
- UI: `src/app/app/marketing/` (6 files)
- API: `src/app/api/marketing/`, `src/app/api/messages/`, `src/app/api/client-comms-prefs/`

### Module 12 — AI Layer (Metis OS Integration) — ✅ BUILT-shell, ⛔ kernel-blocked
- UI: `src/app/app/metis/page.tsx` + MetisChat + lessons subpage
- API: `src/app/api/intelligence/`, kernel-webhook
- **Critical:** Four kernel endpoints called by the inspo flow are missing (see §1.1 executive summary and §2.3).

### Module 13 — Education & Certification Tracking — ✅ BUILT
- UI: `src/app/app/content/` (5 files)
- API: `src/app/api/content/`

### Module 14 — Badges & Certificates — ⚠️ PARTIAL
- DB: `badges`, `student_badges`, `certificates`, `student_certificates` (`014`)
- API: `src/app/api/badges/route.ts` (single handler), `src/app/api/certificates/generate/`
- **Missing:** no UI page for viewing/managing badges or certificates.

### Module 15 — White-Label Theming — ⚠️ PARTIAL (parked for August)
- DB: `theme` JSONB column on `workspaces` (`015`)
- UI: [src/app/app/settings/_components/BrandingConfig.tsx](opelle-app-github/src/app/app/settings/_components/BrandingConfig.tsx) (logo upload, plant preset, texture, typography, color pickers)
- Theme engine: [src/lib/theme.ts](opelle-app-github/src/lib/theme.ts) with 6 plant presets (olive-branch, monstera, fern, succulent, cherry-blossom, eucalyptus). ThemeProvider mounted in both `app/layout.tsx` and `client/(portal)/layout.tsx`.
- **Missing:** consumption-side — 129 files still have hardcoded hex; the engine generates CSS vars but components don't use them. See Part 3.1.

### Module 16 — Opelle Network — ✅ BUILT
- UI: `src/app/app/network/` (7 files)
- API: `src/app/api/network/` (profile, posts, follows)
- DB: `network_profiles`, `network_posts`, `network_follows`, `network_likes`, `network_comments`, `network_saves`, `brand_partnerships`, `brand_verified_stylists`, `stylist_specialties` (`016`)

### Module 17 — ❓ DOES NOT EXIST
No migration `017_*`, no route, no spec. Numbering gap only. Either reserved or accidentally skipped.

### Module 18 — Calla (Student Study Companion) — ⚠️ PARTIAL (deep gaps)
- UI: `src/app/app/calla/` (21 .tsx files)
- API: `src/app/api/calla/` (19 routes)
- DB: 11 `calla_*` tables across [migrations/2026-04-13-calla-study-companion.sql](opelle-app-github/migrations/2026-04-13-calla-study-companion.sql) and [calla-exam-seed.sql](opelle-app-github/migrations/2026-04-13-calla-exam-seed.sql)
- **Per-piece status in §2.1.** Key gaps: quiz/flashcard/test submission APIs do not exist; chat history is React-state only (lost on reload); Metis does not loop logs into study suggestions; NM regulatory content is 10 questions.

### Module 19 — Unified Service Flow — ⚠️ PARTIAL
- DB: `service_sessions` (with status enum), `service_consultations`, `service_tasks`, `post_service_feedback`, `processes` JSONB (`019`, `020`)
- UI: `ActiveServiceWidget.tsx` (in `src/app/app/_components/`), `CheckoutFlow.tsx`, `BeforeAfterCapture.tsx`
- **Per-piece status in §2.2.** Key gaps: Metis-suggested process flows don't exist; before/after photos captured only at checkout, not inline; help button UI not wired to API; post-service feedback never flows into `translation_outcomes`.

---

## 1.3 Database state

### Migration topology
Two folders, both in use:
- `supabase/migrations/` (15 numbered: 001, 002, 003, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 019, 020 — **gaps at 004, 005, 006, 017, 018**)
- `migrations/` (16 dated: 006, 006a, 006b, 2026-02-16 … 2026-04-13)

Plus 3 loose SQL files at repo root:
- `APPLY_THIS_MIGRATION.sql` — adds columns to `tasks` (duplicates work in `002_enhance_tasks.sql`)
- `DATABASE_MIGRATION.sql` — full fresh schema (duplicates `001_fresh_schema.sql`)
- `PRODUCTS_MIGRATION.sql`

The dated `migrations/` folder is the **older path** that was migrated into the numbered structure. The two folders represent design iteration — the gaps in the numbered sequence (004–006) correspond to client-portal work that lives as `006`, `006a`, `006b` in the dated folder. This is the single biggest schema-management risk in the repo.

### Master table count
- **94 total tables** created across all migrations
- **93 / 94 have `ENABLE ROW LEVEL SECURITY`**

### Tables with RLS gaps (multi-tenancy hard requirement per Build Bible Rule 3)

**No RLS at all (critical):**
- `stylist_specialties` — created in `016_opelle_network.sql` with no `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and zero policies. Any authenticated user can read/write any workspace's data.

**RLS enabled but zero policies (locks everyone out):**
- `activity_log` (`2026-02-27-activity-log.sql`)
- `availability_overrides` (`2026-03-30-booking-scheduling.sql`)
- `availability_patterns` (`2026-03-30-booking-scheduling.sql`)
- `brand_partnerships` (`016`)
- `client_stylist_assignments` (`007`)
- `formula_history` (`2026-03-31-team-management.sql`)
- `metis_feedback` (`008`)
- `metis_lessons` (`008`)
- `pending_client_joins` (`006b`)
- `user_profiles` (`2026-04-13-onboarding-user-profiles.sql`)

> Note: a few of these may have inline policies the grep missed, or may be accessed only via service-role. Worth re-confirming in the live DB. Especially `user_profiles` and `activity_log` would silently break the app if RLS truly blocks all reads.

### Build Bible Appendix A drift
- **39 tables listed in the Build Bible are not present in any migration.** Examples: `ce_log`, `ce_requirements`, `compensation_profiles`, `daily_metrics`, `payroll_records`, `inspo_photos`, `state_requirements`, `voice_notes`, `users`, `waitlist`. (Some of these are aspirational; some are renamed in the actual schema — `inspo_photos` ≈ `inspo_submissions`, `users` ≈ `auth.users` + `user_profiles`. Treat the 39 as upper bound on drift, not all real gaps.)
- **55 tables exist in migrations but are not in the Build Bible.** These represent unspecified-but-built work: all `calla_*` tables, the network social tables, mentis conversations, formula entries, photos, post_service_feedback, service_consultations, service_sessions, service_tasks, service_types, user_profiles. **The implementation has outpaced the Build Bible by a wide margin.**

### Conflicts and duplicates
- `client_notifications` table created 3 times (`006`, `006a`, `2026-03-14-phase4-communication.sql`) — all use `IF NOT EXISTS`, safe in isolation but signals merge iteration.
- `tasks` column additions duplicated between `002_enhance_tasks.sql` and root-level `APPLY_THIS_MIGRATION.sql` — uses `IF NOT EXISTS` columns, safe.
- No duplicate columns or policy names that would fail.
- `001_fresh_schema.sql` uses `DROP IF EXISTS CASCADE` — destructive if re-run against a live DB.

---

# PART 2 — AUGUST CRITICAL PATH FEATURES

## 2.1 CALLA (Module 18) — Student Study Companion

**Overall:** Database, exam seed, chat UI, and form UI exist. The **mode flow is a dead end** (no quiz/flashcard/test submission APIs), **chat history is lost on reload**, and **Metis does not yet close the loop** between logged work and study suggestions.

### Onboarding quiz (7 questions)
- **What exists:** [src/app/app/calla/_components/CallaOnboarding.tsx](opelle-app-github/src/app/app/calla/_components/CallaOnboarding.tsx) (7 steps: programStage, primaryWorry, textbook, strong/weak areas, study prefs, state, notes). [src/app/api/calla/onboarding/route.ts](opelle-app-github/src/app/api/calla/onboarding/route.ts) POSTs to `calla_profiles` and fires welcome message via Metis.
- **What is missing:** No client-side validation beyond `programStage` (weak/strong area selections and study prefs are not required). Individual quiz answers are not persisted, only aggregated profile.
- **What needs to change:** add required-field validation; optionally persist individual answers.
- **Complexity:** S

### Conversational chat via Metis
- **What exists:** [src/app/app/calla/_components/CallaChat.tsx](opelle-app-github/src/app/app/calla/_components/CallaChat.tsx) with message history, mode selector, quick actions. [src/app/api/calla/chat/route.ts](opelle-app-github/src/app/api/calla/chat/route.ts) calls `callaChat()` in `src/lib/kernel.ts:420–441`. Context assembled by `buildCallaContext()` includes profile, performance, classroom_logs, floor_logs, technique_reviews, progression.
- **What is missing:** **Conversation messages are React-state only.** No `calla_conversations` / `calla_messages` writes. Reload = empty chat. No conversation title generation.
- **What needs to change:** persist messages to DB; load history on mount.
- **Complexity:** M

### NIC exam content seeded
- **What exists:** [migrations/2026-04-13-calla-exam-seed.sql](opelle-app-github/migrations/2026-04-13-calla-exam-seed.sql) — 50 NIC questions + 25 flashcards across 5 domains, RLS allows public read.
- **What is missing:** no source attribution, no review audit trail, no difficulty distribution guarantee.
- **What needs to change:** content audit against the current NIC blueprint (subject-matter work, not code).
- **Complexity:** M (content review)

### New Mexico regulatory content
- **What exists:** Same migration adds 10 NM-specific questions under "Professional Practices → NM State Law" (1,600 hours, 3-year renewal, license posting, etc.).
- **What is missing:** Only 10 questions. No NM-specific flashcards. No coverage of NM-specific sanitation rules or disciplinary procedures. Not cross-referenced with current NM Board admin code.
- **Complexity:** M

### Study modes (quiz / flashcards / practice test / Q&A)
- **What exists:** Card components — `QuizCard.tsx`, `FlashcardCard.tsx`, `PracticeTest.tsx`. Mode selector in `CallaChat`.
- **What is missing:** **No API routes exist to fetch quiz questions by domain, score submissions, or update `calla_study_sessions` / `calla_topic_performance`.** `PracticeTest.tsx` expects a `questions` prop but no route provides them. **The student cannot actually take a quiz, flashcard run, or practice test today.**
- **What needs to change:** create `/api/calla/mode/quiz/`, `/api/calla/mode/quiz/submit/`, `/api/calla/mode/flashcard/`, `/api/calla/mode/test/` (fetch + score endpoints).
- **Complexity:** L

### Classroom log form
- **What exists:** [src/app/app/calla/_components/ClassroomLogForm.tsx](opelle-app-github/src/app/app/calla/_components/ClassroomLogForm.tsx). [src/app/api/calla/log/classroom/route.ts](opelle-app-github/src/app/api/calla/log/classroom/route.ts) — POST creates `calla_classroom_logs`, awards 30 XP, checks achievements.
- **What is missing:** Technique-name list hardcoded in component (no DB lookup). Photo upload field exists but storage routing not confirmed in the form.
- **Complexity:** S

### Floor log form
- **What exists:** [src/app/app/calla/_components/FloorLogForm.tsx](opelle-app-github/src/app/app/calla/_components/FloorLogForm.tsx). `calla_floor_logs` table exists.
- **What is missing:** `/api/calla/log/floor/route.ts` could not be confirmed present (classroom log route exists; floor log route may be missing). Worth verifying directly.
- **Complexity:** S

### Stats / progress dashboard
- **What exists:** [src/app/api/calla/stats/route.ts](opelle-app-github/src/app/api/calla/stats/route.ts) returns progression + topic performance + session count. `ProgressionCard.tsx`, `AchievementGrid.tsx`, `LeaderboardPanel.tsx` are display components.
- **What is missing:** **No page wires `/api/calla/stats` to a dashboard.** No domain-breakdown UI (`Hair Design: 82%`). No trend visualization. `LeaderboardPanel` references endpoints that don't exist.
- **Complexity:** M

### Connection layer (Metis bridges logs into study suggestions)
- **What exists:** [src/lib/intelligence/buildCallaContext.ts](opelle-app-github/src/lib/intelligence/buildCallaContext.ts) assembles classroom + floor logs into the studentContext passed to Metis on every chat turn.
- **What is missing:** No endpoint that explicitly says "student just logged X, recommend next study topic." No webhook from Metis emitting "after balayage → quiz on color theory." Logs are visible to Metis-as-context but not acted on as suggestions.
- **Complexity:** M

**CALLA-specific kernel endpoints needed:** None new — the existing `/api/v1/ai/chat` already accepts `system_prompt_override` + `student_profile`, which `callaChat()` uses. The four missing kernel endpoints in §1.1 are inspo-flow, not Calla.

---

## 2.2 UNIFIED SERVICE FLOW (Module 19)

**Overall:** Bones are solid. State machine and consultation work. Three notable wire-up bugs and one architectural gap (Metis process suggestions don't exist) prevent the experience from feeling "complete."

### Multi-process timer (sequential unlocking)
- **What exists:** `processes` JSONB on `service_sessions` (migration `020`) with `dependsOn`. `ActiveServiceWidget.tsx` computes `isBlocked` from dependency status. `addProcess()` in [src/lib/db/service-sessions.ts](opelle-app-github/src/lib/db/service-sessions.ts) stores `{ name, durationMinutes, notes, sequence, dependsOn }`.
- **What is missing:** No UI timeline visualization to show which process is blocking which.
- **Complexity:** M

### Metis-suggested process flows
- **What exists:** `MetisSuggestions.tsx` fetches generic suggestions from `/api/intelligence/suggestions`.
- **What is missing:** No process-flow-specific endpoint (e.g., "client wants balayage → lighten + tone + gloss"). No UI to accept a Metis-suggested flow and call `addProcess()` programmatically.
- **Complexity:** XL

### Inline formula display
- **What exists:** `"formula"` tab in `ActiveServiceWidget` renders a `formulaText` textarea.
- **What is missing:** The POST endpoint `/api/services/[id]/formula` (called by the widget) was not located in the routes search. Likely missing.
- **Complexity:** S

### Inline before/after photo capture
- **What exists:** [BeforeAfterCapture.tsx](opelle-app-github/src/components/BeforeAfterCapture.tsx) (client-side compress to 1024px, JPEG 0.8). Used in `CheckoutFlow.tsx` and `ProgressDashboard.tsx`.
- **What is missing:** **NOT integrated into `ActiveServiceWidget` during `in_progress` / `processing`.** Photos are captured at checkout only — but Build Bible Rule 9 (line ~973) requires the *before* photo at service start.
- **Complexity:** M

### Inspo photo display alongside formula
- **What exists:** Widget fetches `GET /api/clients/{clientId}/inspo-photos` and renders thumbnails in the `"cheatsheet"` tab.
- **What is missing:** Inspo photos are not shown in the `"formula"` tab next to the formula textarea (where the student would actually look during the service).
- **Complexity:** S

### Task-connected help request system
- **What exists:** [src/app/api/services/[id]/help/route.ts](opelle-app-github/src/app/api/services/[id]/help/route.ts) — creates urgent service_task, sets session status to `needs_help`, logs activity.
- **What is missing:** `ActiveServiceWidget` has help UI state (`helpOpen`, `helpNote`, `helpType`) but **never renders the help form in any tab and never calls the POST endpoint.** Backend is ready, UI is not wired.
- **Complexity:** S

### Consultation step
- **What exists:** `service_consultations` table (`019`). [src/app/api/services/[id]/consultation/route.ts](opelle-app-github/src/app/api/services/[id]/consultation/route.ts). `"consult"` tab in widget with full form; auto-advances session to `consultation` status.
- **What is missing:** Nothing material.
- **Complexity:** S

### Post-service feedback → Translation Engine
- **What exists:** [src/app/api/services/[id]/feedback/route.ts](opelle-app-github/src/app/api/services/[id]/feedback/route.ts) writes to `post_service_feedback` and publishes a `service.feedback_submitted` kernel event. `translation_outcomes` table has `stylist_feedback` and `outcome_success` columns.
- **What is missing:** **Broken chain.** Nothing reads `post_service_feedback` and writes it into `translation_outcomes.stylist_feedback`. `service.completed` auto-inserts a blank translation_outcome row, but feedback never backfills. Translation Engine (the patent claim per Rule 9) cannot learn.
- **Complexity:** M

### State machine integrity
Valid transitions defined in [src/lib/types.ts](opelle-app-github/src/lib/types.ts):
```
checked_in   → consultation, in_progress
consultation → in_progress
in_progress  → processing, needs_help, finishing
processing   → in_progress, needs_help, finishing
needs_help   → in_progress, processing, finishing
finishing    → complete
complete     → ∅
```
**No violations found** — all status updates in code validate against `SERVICE_SESSION_TRANSITIONS` before applying.

### Mobile usability
- Widget has expand/collapse but **no responsive breakpoint classes** (no `sm:` / `md:`)
- Photo capture uses standard `<input type="file">` (no `capture="environment"`)
- Formula textarea is full-viewport-width on small screens — not optimized
- Tabs may overflow on phone widths

---

## 2.3 INSPO-TO-FORMULA — STUDENT-FIRST FLOW (NEW SCOPE)

> **Highest-priority new feature in this audit.**

### Current entry path and architecture
Two existing entry points, both require a client:
1. **Stylist side:** [src/app/app/formulas/log/page.tsx](opelle-app-github/src/app/app/formulas/log/page.tsx) — `ClientPicker` is mandatory at line 158. Saves to `formula_entries`.
2. **Client portal side:** [src/app/client/(portal)/inspo/page.tsx](opelle-app-github/src/app/client/(portal)/inspo/page.tsx) — checks `permissions.can_upload_inspo`. Photos uploaded via `InspoUploader.tsx`, saved to `inspo_submissions` at `client-inspo/{workspace_id}/{client_id}/{submission_id}/photo_*.jpg`. Requires a `client_users` row linking the auth user to a `client_id`. Vision analysis runs synchronously after upload.

There is **no student-on-the-floor entry point.**

### Does it require `client_id`?
**Yes — at both the DB and API layers.**

- **DB:** [migrations/2026-02-16-formula-entries.sql](opelle-app-github/migrations/2026-02-16-formula-entries.sql) line 18: `client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE`
- **API:** [src/app/api/formula-entries/route.ts](opelle-app-github/src/app/api/formula-entries/route.ts) line 26: `if (!body.clientId || !body.serviceTypeId || !body.rawNotes?.trim())` returns 400.
- **API:** [src/app/api/client/inspo/route.ts](opelle-app-github/src/app/api/client/inspo/route.ts) line 72: extracts `clientId` from `client_users`; if no row, returns 403.
- **inspo_submissions** table's `client_id` is not explicitly `NOT NULL` in the migration, but the API always populates it.

### What needs to change to make it client-optional
**DB (2 changes):**
1. `formula_entries.client_id` → `UUID` (drop `NOT NULL`).
2. `inspo_submissions.client_id` → explicitly nullable; add `user_id UUID REFERENCES auth.users` plus a `CHECK (client_id IS NOT NULL OR user_id IS NOT NULL)` constraint to keep multi-tenant integrity.

**API (3 routes):**
1. `/api/formula-entries` POST — remove `clientId` from required validation; pass through as nullable to `createFormulaEntry()`.
2. `/api/client/inspo` POST — branch on mode: if student-standalone, populate `user_id` and leave `client_id` null; else current behavior.
3. New `PATCH /api/formula-entries/[id]/client` (and equivalent for inspo) for retroactive attachment.

**lib (1 helper):**
- [src/lib/db/formula-entries.ts](opelle-app-github/src/lib/db/formula-entries.ts) `createFormulaEntry()` lines 81–132 — accept `clientId?: string`.

**UI (2 components):**
1. `ClientPicker.tsx` — add a "Save to my learning library" toggle.
2. `InspoUploader.tsx` — add a "Save to my library" vs "For my stylist" mode toggle; pass `mode` to the API.

### Mobile-device viability
- **Camera capture:** ⚠️ Current `<input type="file">` lacks `capture="environment"` (`InspoUploader.tsx:245`). **One-line fix** to launch the rear camera on mobile.
- **Image processing:** ✅ Already client-side: canvas-compress to 1024px / JPEG 0.8. HEIC handled.
- **Vision analysis:** ⚠️ Synchronous wait, 60-second timeout. Blocks the page during analysis. No retry. Today, if the kernel endpoint is down, the user sees "Photos were saved — tap to retry."
- **Formula display:** ✅ Already responsive (`sm:grid-cols-2`, flex-wrap on cards, pre-wrap text). Mobile-friendly today.

### "Save to my learning library" path
Best fit is to extend `inspo_submissions` with `user_id` plus the constraint above. It already has `ai_analysis JSONB`, `client_notes`, `client_summary`, `feasibility`, `requires_consult` — everything the standalone student would want. `calla_classroom_logs` doesn't fit because it stores raw photo URLs only (no `ai_analysis`) and is keyed to a `technique_name`.

### Retroactive attach to client
Low cost. Once `client_id` is nullable on the two tables, the new `PATCH` endpoint just updates the row. Existing entries are unaffected. RLS needs a small extension so the row remains visible to its `user_id` even after being assigned to a `client_id`.

### Kernel endpoints (inspo flow)
Per [docs/KERNEL-ENDPOINTS-NEEDED.md](opelle-app-github/docs/KERNEL-ENDPOINTS-NEEDED.md):

| Endpoint | Called from | Status | Used by which path |
| --- | --- | --- | --- |
| `POST /api/v1/ai/analyze-inspo-vision` | `src/lib/kernel.ts:321` (`analyzeInspoDirect()`) | ❌ **MISSING** | Standalone student flow — **MINIMUM REQUIRED** |
| `POST /api/v1/ai/stylist-intelligence` | `src/lib/kernel.ts:350` | ❌ MISSING | Stylist brief; not strictly needed for student standalone |
| `POST /api/v1/ai/appointment-flag` | `src/lib/kernel.ts:373` | ❌ MISSING | Appointment time-mismatch warning; not needed for standalone |
| `POST /api/v1/ai/inspo-formula-suggestion` | `src/lib/kernel.ts:407` | ❌ MISSING | Formula generation from inspo |
| `POST /api/v1/ai/parse-formula` | `src/lib/kernel.ts:228` | ✅ LIVE | Used by `/api/formulas/parse` |
| `POST /api/v1/events/ingest` | `src/lib/kernel.ts:32` | ✅ LIVE | All event publishing |

**Minimum kernel work to unblock standalone student inspo:** `analyze-inspo-vision` + `inspo-formula-suggestion`. The other two (stylist-intelligence, appointment-flag) are stylist-side.

### Overall scope summary
Making inspo-to-formula client-optional is small inside Opelle: 2 DB migrations, 3 API route edits, 2 UI toggles, 1 new PATCH endpoint, 1-line camera capture fix, plus RLS adjustments. **The blocking dependency is the four missing kernel endpoints**, which live outside this repo.

---

## 2.4 ROLE SYSTEM (Module 9)

### 1. Are all 8 roles defined?
**No — 6 of 8.**
In [src/lib/permissions.ts](opelle-app-github/src/lib/permissions.ts): `owner`, `admin`, `instructor`, `stylist`, `student`, `front_desk`.
**Missing:** `assistant`, `booth_renter`.
(`UserType` in [src/lib/types.ts](opelle-app-github/src/lib/types.ts:21) is a separate concept used only for onboarding routing — `'student' | 'practitioner' | 'salon_owner' | 'school_admin'`.)

### 2. Does `school_mode` correctly gate student supervision?
**`school_mode` does not exist in the codebase.** Zero grep hits. No DB column, no env var, no helper. The only related flag is `workspaces.is_salon` (from `2026-03-31-team-management.sql`). No supervision gating logic anywhere.

### 3. Does `booth_renter` data isolation work via RLS?
**No — the role does not exist.** No RLS policy references `booth_renter`.

### 4. Does `assistant` correctly receive tasks and see station status?
**No — the role does not exist.** Tasks system has a `tasks.assign` permission but no `assistant` role to grant it to. Floor status view shows all workspace students to anyone with `floor.view`.

### 5. Onboarding routing — does it route into the actual role?
**Routes correctly, but inserts the wrong workspace role.**

Flow trace through [src/app/api/onboarding/complete/route.ts](opelle-app-github/src/app/api/onboarding/complete/route.ts):
- Step 4 (line 127): `workspace_members` insert hardcodes `role: 'owner'` for every new user.
- Step 5 (line 134): `user_profiles.user_type` is set to the chosen type (student / practitioner / salon_owner / school_admin).
- Step 6 (line 139): URL redirect uses `user_type`:
  - `student` → `/app/calla`
  - `school_admin` → `/app/floor`
  - everything else → `/app/dashboard`

**Result:** A student is correctly redirected to Calla on the first page load, but in the `workspace_members` table they are stored as `owner`. Any subsequent permission check that reads `workspace_members.role` (which is what `permissions.ts` does) gives the student owner-level permissions inside the workspace. **This is a permissions bug, not a routing bug.**

### 6. Is the `user_profiles` table approach implemented?
**Partially.** Table exists ([migrations/2026-04-13-onboarding-user-profiles.sql](opelle-app-github/migrations/2026-04-13-onboarding-user-profiles.sql)) with `user_type`, `onboarding_completed`. Middleware ([src/middleware.ts](opelle-app-github/src/middleware.ts):26–40) reads `onboarding_completed` to gate `/app/*`. **But `user_type` is written and never read after onboarding.** All permission checks go through `workspace_members.role`, which doesn't reflect the user_type.

---

## 2.5 CLASSROOM SCHEDULE VIEW

### What does the schedule view currently show?
[src/app/app/appointments/page.tsx](opelle-app-github/src/app/app/appointments/page.tsx) shows **all workspace appointments** filtered by `workspace_id`. No per-user filtering, no cohort filtering, no student-vs-instructor distinction.

### Available data structures for grouping students
**None.** Searched all migrations for `cohort`, `classroom`, `group`, `class_id`, `school_id`:
- No `cohorts` table
- No `classrooms` table
- No `cohort_id` column on `workspace_members`, `calla_profiles`, `calla_classroom_logs`, or any other table
- No `school_id` on `user_profiles`

Only grouping that exists is the workspace itself.

### What it would take to add a cohort view
1. **DB:** add `cohort_id UUID` to `calla_profiles` (nullable), OR create `student_cohorts(id, workspace_id, name, owner_id)` + `cohort_members(user_id, cohort_id)`. Add `cohort_id` to `calla_classroom_logs` / `calla_floor_logs` for fast filtering.
2. **Query:** join appointments → student identity → cohort.
3. **UI:** add a "View" toggle to `/app/appointments` — "My schedule" vs cohort dropdown.
4. **RLS:** policies to restrict cohort visibility to cohort members + instructors.

**Complexity:** M

---

## 2.6 STUDENT EXPERIENCE END-TO-END

| Step | Status | Notes |
| --- | --- | --- |
| 1. Sign up → onboarding quiz → routed into student role with school_mode | ⛔ BROKEN | Routing to `/app/calla` works. **But `workspace_members.role` is set to `owner` for every new user**, and `school_mode` does not exist. |
| 2. Land in student dashboard | ✅ WORKS | Student redirected to `/app/calla` — separate from stylist `/app/dashboard`. |
| 3. Open Calla → complete onboarding → personalized first message | ✅ WORKS | `CallaOnboarding.tsx` 7-step flow → `/api/calla/onboarding` writes `calla_profiles` → welcome message via Metis with `buildCallaContext`. |
| 4. Log a classroom assignment (with photos) | ✅ WORKS | `ClassroomLogForm` + `/api/calla/log/classroom` writes `calla_classroom_logs`, awards XP. |
| 5. Floor time: log client → start service → multi-process timers → before/after → complete → feedback prompt | ⚠️ MOSTLY WORKS | Check-in, session creation, status flow, process timers, completion all work. **Before-photo capture is at checkout not at start.** **Help button has no API call.** **Feedback writes to DB but never backfills `translation_outcomes`.** |
| 6. Inspo-to-formula on a phone in the chair | ⚠️ UNTESTED FOR STUDENT-STANDALONE | Inspo tab loads for an existing client. Standalone student-without-client path does not exist yet (see §2.3). |
| 7. Study session in Calla referencing logged work | ⚠️ PARTIAL | `buildCallaContext` pulls classroom + floor logs into the chat context. Calla can answer "what did I do yesterday" — **but the practice test / quiz mode itself is non-functional** (no submission API), so a structured study session is broken. |

---

# PART 3 — KNOWN DEBT (FOR LATER, NOT AUGUST)

## 3.1 Theming hardcoded values
**129 files contain hardcoded hex values. NOT August work — Belle is accepting current visual state.** For future reference, top concentrators:

1. `src/app/globals.css` — 52 instances
2. `src/app/app/calla/_components/PracticeTest.tsx` — 18
3. `src/app/app/clients/[id]/_components/InspoTab.tsx` — 14
4. `src/app/app/calla/_components/TechniqueReview.tsx` — 14
5. `src/app/app/app/progress/_components/ProgressDashboard.tsx` — 13
6. `src/app/app/calla/_components/FloorLogForm.tsx` — 12
7. `src/app/app/calla/_components/QuizCard.tsx` — 12
8. `src/app/app/products/[id]/_components/InventoryPredictionCard.tsx` — 12 (Tailwind color classes)
9. `src/app/app/calla/_components/LeaderboardPanel.tsx` — 11
10. `src/app/app/calla/_components/TestResults.tsx` — 11
11. `src/app/app/products/movements/page.tsx` — 10
12. `src/app/app/calla/_components/FlashcardCard.tsx` — 9
13. `src/app/app/calla/_components/ProgressionCard.tsx` — 8
14. `src/app/app/calla/log/page.tsx` — 8
15. `src/app/app/calla/_components/MessageBubble.tsx` — 7
16. `src/app/app/products/_components/QuickAdjustButton.tsx` — 7
17. `src/app/app/settings/_components/BrandingConfig.tsx` — 5
18. `src/app/app/settings/_components/BookingConfig.tsx` — 4
19. `src/components/BarcodeScanner.tsx` — 3
20. `src/app/client/(portal)/book/request/_components/RequestForm.tsx` — 3

Additionally, 174 files use `style={{}}` inline objects with hardcoded values. CALLA components are the worst offenders.

## 3.2 Color cost tracking (Vish/SalonScale replacement)
**0% implemented.** No `color_cost`, `tube`, `salonscale`, `vish`, or per-formula cost columns anywhere. `products` table has `costCents` but no formula→product cost aggregation, no per-formula cost view, no API. Spec-only.

## 3.3 White-label theming UI
**Infrastructure is more complete than Belle remembers.** `ThemeProvider` is mounted in both app and client-portal layouts. [src/lib/theme.ts](opelle-app-github/src/lib/theme.ts) has 6 plant presets (olive-branch, monstera, fern, succulent, cherry-blossom, eucalyptus) and CSS-var generation. `BrandingConfig.tsx` has full settings UI (logo, plant preset, texture, typography, color pickers). **What's incomplete is consumption-side:** the 129 hardcoded-color files don't read from the theme tokens. The engine generates the variables; the components ignore them. Parked.

## 3.4 Other spec-only modules (not on the critical path)
- **Build Bible §8.4 Formula Portability & Consent** — 0 code. V2.
- **Build Bible §8.5 Opélle Community Layer** — 0 code for the consent/reputation features (the `network_*` social tables in `016` cover only the feed/follow side).
- **Build Bible Tier-1 Future Plays: Product Performance Scoring** — depends on color-cost data that isn't captured.

---

# PART 4 — RISK FLAGS

### 1. Hidden complexity in critical-path features
- **[src/app/api/services/complete/route.ts](opelle-app-github/src/app/api/services/complete/route.ts)** (~243 lines) — runs a 10-step cascade (photo validation → stock deduction → movement records → low-stock alerts → formula history → translation outcomes → kernel event → badges → marketing automations). **Inventory deductions are explicitly non-atomic** (comment in code: "NOTE: Stock deductions are not atomic"). With 15–25 students completing services simultaneously, overlapping deductions can corrupt inventory.
- **`src/lib/kernel.ts`** has 4 chained kernel calls in the inspo flow with cumulative 135s timeout and no retry / circuit-breaker. A single slow chain hangs the user.
- **`InspoUploader.tsx`** synchronously waits on vision analysis with a 60s timeout. No graceful fallback if endpoint is missing — and as of today, the endpoint **is** missing.

### 2. Missing kernel endpoints (the August-blocker list)
From [docs/KERNEL-ENDPOINTS-NEEDED.md](opelle-app-github/docs/KERNEL-ENDPOINTS-NEEDED.md):

| Endpoint | Blocks |
| --- | --- |
| `POST /api/v1/ai/analyze-inspo-vision` | All client + student inspo flows |
| `POST /api/v1/ai/stylist-intelligence` | Stylist intelligence briefs from client Q&A |
| `POST /api/v1/ai/appointment-flag` | Auto-warning for appointment time mismatches |
| `POST /api/v1/ai/inspo-formula-suggestion` | "Suggest formula from inspo" button |

Existing live endpoints: `analyze-inspo` (different from `analyze-inspo-vision`), `client-profile`, `suggest-formula`, `product-enrichment`, `rebook-message`, `inventory-predictions`, `parse-formula`, `chat`, `distill-lessons`, `suggestions`.

### 3. Fragile / duct-taped code
Counts across `/src`:
- `TODO` — 1 instance (`src/lib/kernel.ts:461`, dead `kernelGet` function)
- `FIXME` / `HACK` / `XXX` — 0
- `@ts-expect-error` — 1 (`src/lib/db/translations.ts:32`, unsafe cast on color-shades aggregate)
- `eslint-disable` — 3 (2 in `kernel.ts` for TS strictness, 1 in `PracticeTest.tsx` for exhaustive-deps)
- `as any` — minimal (1 in `translations.ts`)

**The codebase is unusually clean.** Most "debt" is in untested kernel integration points (silent failures when endpoints are missing) rather than legacy code.

### 4. Build Bible / implementation drift (top 3)
1. **Module 9 (Team) — 6 of 8 roles, no school_mode.** The Bible specs all 8 roles with school_mode supervision; code has 6 and no flag.
2. **Module 8.5 Opélle Community Layer.** Bible has 4 pages on community, brand partnerships, reputation. Code has feed/follow tables only.
3. **39 tables in Bible Appendix A absent from migrations / 55 tables in migrations absent from Bible.** The Bible is at least one major revision behind the implementation. (Some apparent "missing" tables are renamed in code.)

### 5. Performance concerns for a classroom of 15–25 simultaneous students
1. **N+1 in [src/app/api/cron/rebook-reminders/route.ts](opelle-app-github/src/app/api/cron/rebook-reminders/route.ts)** — loops client preferences executing 3 DB queries per client. 100 clients → 300 queries per cron tick.
2. **Race condition in [src/app/api/services/complete/route.ts](opelle-app-github/src/app/api/services/complete/route.ts)** — non-atomic product stock read→write. Concurrent completions during a class shift could triple-deduct a single tube of developer.
3. **1-second polling in [src/app/app/_components/ActiveServiceWidget.tsx](opelle-app-github/src/app/app/_components/ActiveServiceWidget.tsx)** — `setInterval(tick, 1000)` per open tab. 20 students = 20 req/sec sustained, no throttling.
4. **Missing `.limit()` on reports** — `/src/app/api/reports/*` endpoints use `.select('*')` without bounds. Large workspaces / many simultaneous report views can blow memory.
5. **Kernel timeout cascade** — inspo flow chains 4 kernel calls with 60+30+15+30 = 135s worst case. 20 students simultaneously uploading inspo = 45 cumulative minutes of kernel load with no graceful degradation.

---

## END OF AUDIT

Belle: this is the source of truth as of 2026-05-25. Plan and prioritization come next, in a separate session.
