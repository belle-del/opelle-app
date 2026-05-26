# Calla — Student Study Companion Design

*Date: 2026-04-13*
*Status: Approved*

## Overview

Calla is a conversational study companion for cosmetology students, living as a tab inside the existing Opelle `/app` shell at `/app/calla/*`. Fear of failing the board exam gets students in. Pride in their work keeps them there. Metis powers personalized responses.

## Architecture

- **Routes:** `/app/calla/*` inside existing app shell
- **Database:** 12 new `calla_*` tables with RLS (students see only own data)
- **API:** `/api/calla/*` following existing REST patterns
- **AI:** New `callaChat()` + `buildCallaContext()` functions, separate from stylist Metis
- **UI:** Existing design system (garnet primary, bark personality, brass achievements, olive success)

## Database Schema

12 tables, all with `user_id` referencing `auth.users(id)` and RLS:

1. `calla_profiles` — onboarding answers (program_stage, primary_worry, textbook, strong_areas, weak_areas, study_preference, state, onboarding_completed_at)
2. `calla_conversations` — chat sessions (title, mode, messages JSONB, topics, started_at, last_message_at)
3. `calla_exam_content` — question/flashcard bank (domain, topic, subtopic, content_type, question_text, options JSONB, correct_answer, explanation, difficulty, state)
4. `calla_study_sessions` — completed sessions (mode, domains, duration, accuracy, topics_flagged_weak)
5. `calla_topic_performance` — running accuracy per domain/topic (questions_seen, questions_correct, accuracy_percentage, flagged_weak)
6. `calla_classroom_logs` — technique practice (technique_name, duration, is_mannequin, photo_urls, self_assessment, notes)
7. `calla_floor_logs` — client service logs (service_type, client_identifier, products_used, formula_notes, photo_urls, outcome_notes)
8. `calla_technique_reviews` — photo coaching (photo_url, technique_category, analysis JSONB, feedback_text, score, previous_review_id, improvement_delta)
9. `calla_progression` — XP/level/streak (total_xp, current_level, current_streak, longest_streak, streak_freezes_available, last_activity_date)
10. `calla_achievements` — earned achievements (achievement_key, earned_at)
11. `calla_xp_log` — XP audit trail (action_type, xp_earned, multiplier, reference_id)

Exam content seeded via migration (~50-100 items per domain, 5 domains).

## Onboarding Flow

7 screens at `/app/calla/onboarding`, gated by missing `calla_profiles` row:

1. Welcome + program stage
2. Primary worry
3. Textbook (Milady default)
4. Strong & weak areas (chip grids from NIC domains)
5. Study preference (multi-select)
6. State (NM default)
7. First log entry (free text → becomes first classroom log)

Single POST to `/api/calla/onboarding` at end. Post-onboarding: Metis generates personalized welcome + 2-3 next actions.

## Chat Interface

Main conversational UI at `/app/calla`:
- Message bubbles (user right/garnet, Calla left/stone)
- Quick action pills: Quiz me, Flashcards, Practice test, Log practice
- Mode indicator (Chat/Quiz/Flashcard/Practice Test)
- Conversation sidebar for history

## Study Modes

All entered via chat, rendered inline (except practice test):

- **Quiz:** Adaptive questions from weak areas, inline card UI with options, immediate feedback
- **Flashcards:** Swipeable front/back cards, mastery tracking
- **Practice test:** Full-screen 60-question NIC format, 90-min timer, no feedback until submit
- **Free Q&A:** Default conversational mode

## Logging

- **Classroom log:** technique, duration, mannequin toggle, photos, self-assessment (1-5), notes
- **Floor log:** service type, client identifier, products, formula, photos, outcome

## Technique Photo Coaching

Upload → Supabase Storage → Metis vision analysis → structured feedback (What's working / What to adjust / Try this next) + score. Tracks improvement via `previous_review_id`.

## Gamification

XP: 25-150 per action. 10 levels (0-25,000 XP). Streaks with multipliers (1x → 2x at 31+ days). 10 achievements. Opt-in cohort leaderboards.

## Metis Integration

- `callaChat()` in `kernel.ts` — POST to `/api/v1/ai/calla-chat`
- `callaAnalyzeTechnique()` — POST to `/api/v1/ai/analyze-technique`
- `buildCallaContext()` — assembles student profile, performance, logs, progression
- Calla voice: warm, plainspoken, confident, like a slightly-older friend. Never corporate. Never "journey."

## API Endpoints

19 endpoints under `/api/calla/*` — onboarding, chat, conversations, logging, quiz, flashcards, test, technique review, stats, achievements, leaderboard.

## Component Tree

```
/app/calla/
├── layout.tsx (onboarding gate, nav)
├── page.tsx (main chat)
├── onboarding/page.tsx
├── stats/page.tsx
├── log/page.tsx
└── _components/ (15 components)
```
