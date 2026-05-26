# OPELLE — AUGUST RESTART BUILD PACKET
**Owner:** Anabelle Lord
**Target:** August 2026 classroom deployment at Avenue Academy
**Working tree:** `/Users/anabellelord/Opelle/opelle-app-github`
**Last audit:** 2026-05-25 (`OPELLE_AUDIT_AUGUST_RESTART.md`)
**Kernel dependency:** Spec delivered to Mentis team 2026-05-25; build in progress
---
## How to use this packet
Each tier is a self-contained Code/Cowork prompt. Run them in whatever order fits the night, with one rule: **finish a tier before starting the next one in the same domain.** Don't half-finish Calla's submission APIs, switch to roles, and come back. Domain-switching mid-tier is how things break in non-obvious ways.
Tiers 1, 2, 3, 5, 6, and 7 are entirely yours — no external dependencies. Tier 4 has two sub-tiers: 4A is the UI and DB work you do now without the kernel, 4B is the wire-up you do once the kernel endpoints land.
When you finish a tier, mark it done and paste the Code summary back to Claude for a spot-check.
---
## TIER 1 — STOP THE BLEEDING (Critical Bugs + Security)
**Scope:** Things that are broken right now and will hurt you in production. Probably one or two nights of work.
### Prompt for Code

```
This is Tier 1 of Opelle's August restart. We are fixing critical bugs and
security gaps before anything else. Do not refactor anything outside this scope.
Investigate first, then propose a plan, then build. Use vertical slices per
Build Bible rules.
═══════════════════════════════════════════════════════
1. ONBOARDING ROLE BUG
═══════════════════════════════════════════════════════
Two known issues:
A) New user signup writes role='owner' into workspace_members for every user
regardless of selected user_type. Confirmed at
src/app/api/onboarding/complete/route.ts step 4 (~line 127).
B) Belle just tested logging in with her existing owner email and was treated
as a student. This is a SEPARATE bug from A — it's in how the app reads role
on session load, likely reading user_profiles.user_type instead of
workspace_members.role somewhere in the auth path or middleware.
For BOTH bugs:
- Trace the full role-resolution path from auth session → role-aware UI
  rendering
- Identify every place role is read and confirm it's reading from
  workspace_members.role, not user_profiles.user_type
- Fix the onboarding insert to map user_type → role correctly:
  - user_type='student' → role='student'
  - user_type='practitioner' → role='stylist'
  - user_type='salon_owner' → role='owner'
  - user_type='school_admin' → role='admin'
- Confirm Belle's existing owner account resolves to owner role on next login
Add a test that covers each user_type → workspace_members.role mapping.
═══════════════════════════════════════════════════════
2. SCHOOL_MODE FLAG
═══════════════════════════════════════════════════════
The codebase has no school_mode anywhere. The Build Bible specs it as a
workspace-level flag that gates student supervision requirements. Implement:
- Add boolean column workspaces.school_mode (default false)
- Add helper isSchoolMode(workspaceId) in src/lib/permissions.ts
- Wire school_mode into the existing student role permissions:
  - When school_mode=true: students require instructor approval gates on
    service completion, formula entries marked as draft until reviewed
  - When school_mode=false: students operate independently
- Set school_mode=true on Belle's classroom workspace via migration or seed
Do NOT implement the full approval workflow UI in this tier — just the flag,
the helper, and the gating logic. Approval UI is a future tier.
═══════════════════════════════════════════════════════
3. MISSING ROLES (assistant + booth_renter)
═══════════════════════════════════════════════════════
src/lib/permissions.ts has 6 of 8 roles. Add:
- assistant: can view floor_status of workspace, receive tasks, mark tasks
  complete, view assigned stylist's schedule, cannot edit formulas or
  complete checkouts
- booth_renter: full access to their own clients, appointments, formulas,
  inventory — fully isolated from other workspace members via RLS
For booth_renter, add RLS policies that scope every relevant table to
owner_user_id when role='booth_renter'. This is data isolation, not just
permission gating.
═══════════════════════════════════════════════════════
4. RLS GAPS
═══════════════════════════════════════════════════════
Audit flagged these tables as RLS-broken. Fix all of them:
CRITICAL — no RLS at all:
- stylist_specialties (016_opelle_network.sql) — ENABLE ROW LEVEL SECURITY +
  workspace-scoped policies
RLS enabled but zero policies (currently locks out all reads):
- activity_log
- availability_overrides
- availability_patterns
- brand_partnerships
- client_stylist_assignments
- formula_history
- metis_feedback
- metis_lessons
- pending_client_joins
- user_profiles
For each, write workspace-scoped read/write policies based on the table's
actual use. Re-verify by hitting the relevant API endpoint with a
non-service-role auth and confirming reads work.
═══════════════════════════════════════════════════════
5. INVENTORY RACE CONDITION
═══════════════════════════════════════════════════════
src/app/api/services/complete/route.ts has a non-atomic stock deduction.
With 15–25 students completing services simultaneously in a classroom,
concurrent deductions will double- or triple-count the same tube of developer.
Fix by:
- Wrapping the inventory deduction in a Postgres transaction with row-level
  locking (SELECT ... FOR UPDATE) on the product row
- Or using an atomic UPDATE with WHERE stock_qty >= deducted_qty returning
  the new row, and failing the completion if no row updated
Add a concurrent-completion test that fires N parallel completions against
the same product and confirms stock_qty deducts exactly N times.
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate the codebase first. Return a plan before building. After Belle
approves, build everything in this tier, write tests, and report what was
done plus any new issues discovered along the way.
```


---
## TIER 2 — CALLA'S MISSING BRAIN
**Scope:** Calla looks built but the study modes don't work. Students cannot take a quiz today. This tier wires the brain.
### Prompt for Code

```
This is Tier 2 of Opelle's August restart. Calla has 21 components and 11
tables but the study modes are non-functional — no submission APIs exist,
chat history is React-state only, and the stats endpoint isn't wired to a
page. Build the missing layer.
═══════════════════════════════════════════════════════
1. STUDY MODE SUBMISSION APIS
═══════════════════════════════════════════════════════
Build these routes:
GET /api/calla/mode/quiz?domain={domain}&count={n}
- Returns N questions from calla_questions filtered by domain
- Default count=10
- Randomized order
- Excludes questions the student answered correctly in last 7 days
  (configurable)
POST /api/calla/mode/quiz/submit
- Body: { question_id, selected_answer, time_taken_ms }
- Records to calla_quiz_attempts
- Updates calla_topic_performance for the domain
- Returns: { correct, explanation, mentis_followup (optional) }
GET /api/calla/mode/flashcard?domain={domain}&count={n}
- Returns N flashcards from calla_flashcards by domain
- Spaced repetition: prioritize cards the student rated "hard" or hasn't
  seen in 3+ days
POST /api/calla/mode/flashcard/rate
- Body: { flashcard_id, rating: "easy" | "medium" | "hard" }
- Records to calla_flashcard_reviews
- Updates spaced-repetition schedule
GET /api/calla/mode/test?length={n}
- Returns full NIC-format practice test (default 60 questions, 4 domains,
  weighted by NIC blueprint)
POST /api/calla/mode/test/submit
- Body: { answers: [{question_id, selected_answer}], duration_seconds }
- Records to calla_test_attempts
- Returns full results breakdown by domain
- Triggers Metis lesson distillation on weak domains
Wire these to the existing card components (QuizCard.tsx, FlashcardCard.tsx,
PracticeTest.tsx). Confirm the student can take a full quiz, full flashcard
run, and full practice test end-to-end.
═══════════════════════════════════════════════════════
2. CHAT HISTORY PERSISTENCE
═══════════════════════════════════════════════════════
Calla chat is currently React-state only. Persist to calla_conversations +
calla_messages.
- On mount, load the most recent conversation for the student (or create a
  new one)
- Every user + assistant message: insert to calla_messages with
  conversation_id
- Generate conversation title from first user message via existing
  /api/v1/ai/chat with system prompt "Summarize this conversation in 5
  words or less"
- Add a "New conversation" button in CallaChat.tsx
- Add a left-nav conversation list (collapsed by default on mobile)
═══════════════════════════════════════════════════════
3. STATS DASHBOARD WIRE-UP
═══════════════════════════════════════════════════════
/api/calla/stats already returns the right data. Build the page that
consumes it:
- Create src/app/app/calla/stats/page.tsx
- Render ProgressionCard, AchievementGrid, and a new DomainBreakdown
  component
- DomainBreakdown: bar chart of accuracy per NIC domain (Hair Design 82%,
  etc.)
- Trend line: last 30 days of session count + accuracy
- Wire LeaderboardPanel (already exists but references non-existent
  endpoints) — either build the endpoints (workspace-scoped: top 10 in
  classroom by XP this week) or remove the panel entirely. Belle's call.
Add a "Stats" tab to the Calla nav.
═══════════════════════════════════════════════════════
4. FLOOR LOG ROUTE
═══════════════════════════════════════════════════════
ClassroomLogForm has /api/calla/log/classroom. FloorLogForm exists in the UI
but the audit could not confirm /api/calla/log/floor exists. Verify and
build if missing.
═══════════════════════════════════════════════════════
5. NM REGULATORY CONTENT
═══════════════════════════════════════════════════════
Currently 10 NM-specific questions. Belle's classmates need this for their
actual board prep. Expand to at least 50 questions covering:
- Licensing hours, renewal cycle, license posting
- NM sanitation rules (Title 16, Chapter 34)
- NM Board disciplinary procedures
- Permissible vs. impermissible services for student vs. licensed
  cosmetologist in NM
- Required client documentation and recordkeeping
Add 25 NM-specific flashcards on the same topics. Source from NM
Cosmetology Board administrative code (Belle will provide PDF if asked).
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate first. Plan. Build. Test that a student can: open Calla → take
a quiz → take flashcards → take a practice test → see stats → have chat
history persist across reloads.
```


---
## TIER 3 — SERVICE FLOW FINISHING
**Scope:** Service flow is 80% done. Three known bugs and one missing learning loop.
### Prompt for Code

```
This is Tier 3 of Opelle's August restart. The unified service flow
(Module 19) is mostly built. Finish the gaps.
═══════════════════════════════════════════════════════
1. HELP BUTTON WIRE-UP
═══════════════════════════════════════════════════════
The API at src/app/api/services/[id]/help/route.ts is built and ready.
ActiveServiceWidget.tsx has state variables (helpOpen, helpNote, helpType)
but never renders the help form and never calls the endpoint.
Build:
- Help button in the widget header (visible in every tab)
- Modal/drawer that opens with: help type select (assistant_needed,
  instructor_needed, technical_issue), free-text note, submit
- On submit, POST to /api/services/[id]/help
- Show success state; the session transitions to needs_help status
- When help is dispatched (task assigned), show "Help is on the way — [name]
  notified"
═══════════════════════════════════════════════════════
2. INLINE BEFORE-PHOTO AT SESSION START
═══════════════════════════════════════════════════════
Currently before/after photos are captured only at checkout via
BeforeAfterCapture.tsx. Build Bible Rule 9 requires the BEFORE photo at
service start.
- Integrate BeforeAfterCapture into ActiveServiceWidget on transition from
  checked_in → consultation OR checked_in → in_progress
- Block the transition if the before photo is missing (with override option
  for instructor)
- Photo saves immediately, not at checkout
- After photo stays at checkout where it is
═══════════════════════════════════════════════════════
3. INSPO PHOTO IN FORMULA TAB
═══════════════════════════════════════════════════════
Inspo photos render in the cheatsheet tab. The student looks at the formula
tab while mixing. Move (or duplicate) inspo thumbnails into the formula tab,
sized so the student can glance back and forth between the photo and the
formula text.
═══════════════════════════════════════════════════════
4. FEEDBACK → TRANSLATION OUTCOMES BACKFILL
═══════════════════════════════════════════════════════
post_service_feedback writes successfully but never backfills
translation_outcomes.stylist_feedback. The translation engine cannot learn
from outcomes — this breaks one of the patent claims.
Build:
- On INSERT to post_service_feedback, trigger (DB trigger or app-side
  handler) updates the corresponding translation_outcomes row with
  stylist_feedback + outcome_success
- Match on service_session_id → service_completion_id → translation_outcomes
  row
- If no translation_outcomes row exists, create one
- Backfill historical: write a one-time migration that walks all
  post_service_feedback rows and updates translation_outcomes for any that
  were missed
═══════════════════════════════════════════════════════
5. METIS-SUGGESTED PROCESS FLOWS
═══════════════════════════════════════════════════════
Currently MetisSuggestions.tsx returns generic suggestions from
/api/intelligence/suggestions. Belle wants process-flow-specific
suggestions — e.g., "client wants balayage" → suggest a multi-process flow
(lighten → tone → gloss).
Build:
- New endpoint POST /api/intelligence/process-flow-suggestion
- Input: client_goal (text), client_starting_state (from intake or
  client_context)
- Calls /api/v1/ai/suggestions on the kernel with system_prompt_override
  scoping to process flows
- Returns array of suggested processes: [{ name, durationMinutes,
  dependsOn, notes }]
- UI: "Suggested flow" card in the widget that the student can accept
  (calls addProcess() for each suggestion) or dismiss
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate, plan, build, test. Confirm a complete service flow with
multi-process timers, before photo at start, formula displayed alongside
inspo, help button working, post-service feedback hitting the translation
engine.
```


---
## TIER 4A — INSPO-TO-FORMULA (UI + DB, no kernel)
**Scope:** The student-standalone inspo flow that doesn't need the kernel to exist. Build all of it now. When the kernel ships, it just works.
### Prompt for Code

```
This is Tier 4A of Opelle's August restart. The kernel endpoints for inspo
vision and formula suggestion are not live yet — they're in Mentis's queue.
We are building everything that doesn't depend on the kernel NOW so that
when the endpoints land, the only remaining work is testing.
The kernel client wrapper (src/lib/kernel.ts) is already in place and will
fail gracefully when the endpoints return 404. That's expected. Build
around that.
═══════════════════════════════════════════════════════
1. DATABASE — make client_id nullable
═══════════════════════════════════════════════════════
Create a new migration:
ALTER TABLE formula_entries ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE inspo_submissions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE inspo_submissions ADD CONSTRAINT inspo_submissions_owner_check
  CHECK (client_id IS NOT NULL OR user_id IS NOT NULL);
Update RLS on both tables so a row remains visible to its user_id even
after a client_id is later attached.
═══════════════════════════════════════════════════════
2. API CHANGES
═══════════════════════════════════════════════════════
Edit:
- POST /api/formula-entries — drop clientId from required validation, pass
  through as nullable
- POST /api/client/inspo — branch on mode parameter:
  - mode='client' (existing): populate client_id from client_users lookup
  - mode='student_standalone' (new): populate user_id from auth, leave
    client_id null
- src/lib/db/formula-entries.ts createFormulaEntry() — accept
  clientId?: string
Build new:
- PATCH /api/formula-entries/[id]/client — body { client_id }, attaches the
  formula entry to a client retroactively
- PATCH /api/inspo-submissions/[id]/client — same for inspo
═══════════════════════════════════════════════════════
3. UI — STANDALONE STUDENT INSPO ENTRY POINT
═══════════════════════════════════════════════════════
Build a new route:
src/app/app/calla/inspo/page.tsx (or src/app/app/inspo/page.tsx — pick
whichever is cleaner)
- Accessible to role=student without requiring a client_id
- Mobile-first layout (this gets used standing at the chair)
- InspoUploader component reused, with new mode prop
- Show "Save to my learning library" toggle (default ON for students)
- Optional "Attach to client" picker for cases where they want to save to a
  client they're about to log
When the student uploads:
- Photos go to Supabase storage at
  student-inspo/{workspace_id}/{user_id}/{submission_id}/photo_*.jpg
- inspo_submissions row created with user_id, client_id=null,
  mode='student_standalone'
- Kernel call to /api/v1/ai/analyze-inspo-vision fires (will currently 404
  — handle gracefully)
- Show "Analysis pending" state when kernel is not live; show full
  questions UI when it is
═══════════════════════════════════════════════════════
4. MOBILE CAMERA FIX
═══════════════════════════════════════════════════════
InspoUploader.tsx line 245 uses <input type="file"> without
capture="environment". Add capture="environment" so mobile launches the
rear camera by default. One-line change.
═══════════════════════════════════════════════════════
5. ANSWERER_ROLE WIRING
═══════════════════════════════════════════════════════
Per the kernel spec sent to Mentis, the four-call inspo chain needs
answerer_role passed on endpoints 1 and 3. One-line addition in each of:
- analyzeInspoDirect() in src/lib/ai/inspo-analysis.ts — pass answerer_role
  based on submission mode (client_portal → 'client', anything else →
  'stylist')
- generateStylistIntelligence() in src/lib/ai/inspo-analysis.ts — same logic
When kernel is live, the stylist/student answering on the chair gets
cosmetology-fluent questions instead of plain-language client questions.
═══════════════════════════════════════════════════════
6. LEARNING LIBRARY VIEW
═══════════════════════════════════════════════════════
The student needs to see their saved inspo + formula drafts.
Build src/app/app/calla/library/page.tsx:
- List all inspo_submissions where user_id = current user AND
  client_id IS NULL
- Each card: thumbnail, summary, date, "Attach to client" button, "View
  formula draft" link
- Show all formula_entries where client_id IS NULL AND created_by =
  current user
This is the student's personal portfolio of "things I've worked through"
— both pre-launch and post-launch valuable.
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate, plan, build, test. Confirm a student can: open inspo page on
phone → rear camera launches → snap inspo photo → see "analysis pending"
(kernel not live) → photo saved to library → return later and view in
library → optionally attach to a client.
When the kernel goes live, Tier 4B (a single short prompt) tests the
end-to-end flow.
```


---
## TIER 4B — INSPO-TO-FORMULA (kernel wire-up, runs when Mentis ships)
### Prompt for Code

```
The Mentis kernel endpoints from MENTIS_KERNEL_ENDPOINTS_AUGUST.md have
shipped. Time to validate the full inspo-to-formula chain end-to-end.
1. Confirm all four endpoints are live by hitting each with a smoke-test
   request.
2. Run the full chain on test data:
   - Upload an inspo photo as a student (no client)
   - Confirm vision analysis returns questions
   - Answer the questions (cosmetology-fluent, since
     answerer_role='stylist')
   - Confirm stylist intelligence synthesizes
   - Confirm formula suggestion returns a draftable formula
   - Confirm appointment-flag fires (or correctly returns null) for an
     associated appointment
3. Test the same chain in client mode (existing path) to confirm
   answerer_role='client' produces plain-language questions.
4. Performance: time the full chain end-to-end. If > 90 seconds on mobile,
   flag it and we'll add a streaming/progressive UI in a follow-up.
5. Report any kernel response shape mismatches against the spec doc.
```


---
## TIER 5 — CLASSROOM SCHEDULE VIEW
### Prompt for Code

```
This is Tier 5 of Opelle's August restart. The dashboard currently shows
one student/stylist's schedule. Belle's classroom needs a cohort view.
═══════════════════════════════════════════════════════
1. COHORT DATA MODEL
═══════════════════════════════════════════════════════
Create:
- Table student_cohorts: id, workspace_id, name (e.g., "Avenue Class of
  Dec 2026"), instructor_user_id, created_at
- Table cohort_members: cohort_id, user_id, joined_at, PRIMARY KEY
  (cohort_id, user_id)
- Add cohort_id (nullable) to calla_profiles, calla_classroom_logs,
  calla_floor_logs
RLS:
- Cohort members can see their own cohort
- Instructors can see cohorts they own
- Owners/admins see all cohorts in workspace
═══════════════════════════════════════════════════════
2. APPOINTMENTS VIEW TOGGLE
═══════════════════════════════════════════════════════
src/app/app/appointments/page.tsx — add a view selector:
- "My schedule" (default, current behavior)
- "Cohort: [name]" — shows all cohort members' appointments
- "Workspace" — shows everything (owner/admin only)
Color-code appointments by student in cohort view so the instructor can see
who's doing what at a glance.
═══════════════════════════════════════════════════════
3. SEED BELLE'S COHORT
═══════════════════════════════════════════════════════
Create a one-time seed migration that:
- Creates cohort "Avenue Academy — Belle's Cohort"
- Assigns workspace_id to her classroom workspace
- Adds Belle as the first member
- (She'll add classmates manually via UI when onboarding them)
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate, plan, build, test. This sets the foundation for the Mevo
replacement conversation later — the same cohort model extends to full
school management without needing a redesign.
```


---
## TIER 6 — PERFORMANCE HARDENING
### Prompt for Code

```
This is Tier 6 of Opelle's August restart. Belle's classroom will have
15–25 students simultaneously using Opelle on the floor. The audit flagged
five performance concerns that will hurt under that load.
═══════════════════════════════════════════════════════
1. THROTTLE ACTIVESERVICEWIDGET POLLING
═══════════════════════════════════════════════════════
ActiveServiceWidget.tsx uses setInterval(tick, 1000) per open tab. 20
students = 20 req/sec sustained.
- Change to 5-second poll
- Pause polling when the tab is not visible (Page Visibility API)
- Only poll the specific session's status, not all sessions
- Add exponential backoff on consecutive failures
═══════════════════════════════════════════════════════
2. KERNEL CALL RESILIENCE
═══════════════════════════════════════════════════════
src/lib/kernel.ts has no retry, no circuit breaker. The inspo chain can
hang the UI for 135 seconds.
Add:
- Single retry on 502/503/504 with 2-second delay
- Circuit breaker: if 3 consecutive failures from the same endpoint, return
  graceful error for 60 seconds before retrying
- Frontend: show "Mentis is slow — your work is saved, try again in a
  moment" instead of spinner-forever
═══════════════════════════════════════════════════════
3. ADD .LIMIT() TO REPORTS
═══════════════════════════════════════════════════════
/src/app/api/reports/* endpoints use .select('*') without bounds. Add
.limit(1000) (or smaller per-report limit) and add pagination params.
═══════════════════════════════════════════════════════
4. N+1 IN REBOOK-REMINDERS CRON
═══════════════════════════════════════════════════════
/src/app/api/cron/rebook-reminders/route.ts runs 3 queries per client in a
loop. Refactor to a single batched query that joins client_preferences +
appointments + comms_prefs.
═══════════════════════════════════════════════════════
5. SUPABASE CONNECTION POOLING SANITY CHECK
═══════════════════════════════════════════════════════
Confirm Supabase connection pool size is set appropriately for the
expected concurrent load. Document the chosen settings in a README.
═══════════════════════════════════════════════════════
DELIVERABLE
═══════════════════════════════════════════════════════
Investigate, plan, build, test. Run a load test: simulate 20 concurrent
students each completing a service flow with timers, photos, formula
entry, and checkout. Report any further bottlenecks.
```


---
## TIER 7 — DEPLOYMENT READINESS
**Scope:** Not a build tier — pre-launch checklist.
### Prompt for Code

```
This is Tier 7, the last tier before classroom rollout. This is not a
build tier — it's a pre-launch checklist.
═══════════════════════════════════════════════════════
1. SELF-BETA (2 WEEKS, BELLE-ONLY)
═══════════════════════════════════════════════════════
Belle uses Opelle on herself at Mesh and in school for 2 weeks before any
classmate touches it. Real services, real formulas, real Calla study
sessions.
Log every bug to a single file: /docs/SELF_BETA_BUGS.md
- Bug ID, severity (P0/P1/P2), description, repro steps, file/route, fix
  status
- P0 = blocks classroom use, must fix before launch
- P1 = annoying, fix before launch if possible
- P2 = future polish
═══════════════════════════════════════════════════════
2. ONBOARDING SCRIPT FOR FIRST CLASSMATE
═══════════════════════════════════════════════════════
Write a one-pager: how Belle walks a classmate through first login, Calla
onboarding, first classroom log, first floor log.
Tested with one classmate before scaling to the cohort.
═══════════════════════════════════════════════════════
3. ROLLBACK PLAN
═══════════════════════════════════════════════════════
If Opelle is broken during a Friday classroom session, what's the
fallback?
- Document the manual-fallback flow (paper formula log, manual hour
  tracking)
- Confirm no Opelle action is destructive to client data
- Confirm Belle has Supabase dashboard access for emergency fixes
═══════════════════════════════════════════════════════
4. KERNEL STATUS CHECK
═══════════════════════════════════════════════════════
Before classroom launch:
- Confirm all 4 Mentis endpoints are live and responding correctly
- If any are still pending, decide: launch with degraded inspo flow (UI
  shows "analysis pending") OR delay launch by N weeks
═══════════════════════════════════════════════════════
5. LARRY CONVERSATION
═══════════════════════════════════════════════════════
Before classroom use on Avenue premises with Avenue clients, Belle
confirms with Larry that her cohort using Opelle for floor work is
approved.
```

---
## Status tracking
| Tier | Status | Started | Finished | Notes |
|------|--------|---------|----------|-------|
| 1 — Bleeding | ✅ DONE | 2026-05-25 | 2026-05-25 | Commits: 2650259, fb2cd11, e472e7c, ecfcfa1, fc04824, c78682c, f5f5782, a8232e6 |
| 2 — Calla brain | ☐ | | | |
| 3 — Service flow | ☐ | | | |
| 4A — Inspo UI/DB | ☐ | | | |
| 4B — Inspo kernel wire-up | ☐ blocked on Mentis | | | |
| 5 — Classroom schedule | ☐ | | | |
| 6 — Performance | ☐ | | | |
| 7 — Deployment | ☐ | | | |
---
## Out of scope for August (post-launch backlog)
- White-label theming consumption pass (129 files with hardcoded hex)
- Color cost tracking (Vish/SalonScale replacement) — only needed for Mevo replacement
- Build Bible §8.4 Formula Portability & Consent
- Build Bible §8.5 Opélle Community Layer (consent/reputation features)
- Product Performance Scoring
- Full Mevo replacement for Avenue Academy
Any new "should we add…" items go in `POST_AUGUST.md`, not into a tier.
