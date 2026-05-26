# Calla Study Companion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Calla, a conversational AI study companion for cosmetology students, as a tab inside the existing Opelle app shell.

**Architecture:** 12 new `calla_*` database tables with RLS, 19 API routes under `/api/calla/*`, Metis kernel integration via new `callaChat()` + `buildCallaContext()` functions, and a chat-first UI at `/app/calla/*` using the existing design system.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Auth + Storage + RLS), Metis OS kernel, Tailwind CSS 4, Vitest, TypeScript 5

**Root directory:** `/Users/anabellelord/Opelle/opelle-app-github`

---

## Task 1: Database Migration — Core Tables

**Files:**
- Create: `migrations/2026-04-13-calla-study-companion.sql`

**Step 1: Write the migration file**

Create the migration with all 12 Calla tables plus RLS policies. Follow existing patterns from `migrations/2026-03-17-mentis-conversations.sql` (UUID PKs, `gen_random_uuid()`, `TIMESTAMPTZ DEFAULT now()`, `ON DELETE CASCADE`).

```sql
-- ============================================================
-- Calla Study Companion — Database Schema
-- ============================================================

-- 1. Student profiles (onboarding data)
CREATE TABLE IF NOT EXISTS calla_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_stage TEXT NOT NULL CHECK (program_stage IN ('just_started', 'few_months', 'almost_done', 'boards_soon', 'licensed')),
  primary_worry TEXT,
  textbook TEXT DEFAULT 'Milady',
  strong_areas TEXT[] DEFAULT '{}',
  weak_areas TEXT[] DEFAULT '{}',
  study_preference TEXT[] DEFAULT '{}',
  state TEXT DEFAULT 'NM',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_calla_profiles_user ON calla_profiles(user_id);

-- 2. Conversations
CREATE TABLE IF NOT EXISTS calla_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New conversation',
  mode TEXT DEFAULT 'chat' CHECK (mode IN ('chat', 'quiz', 'flashcard', 'test')),
  messages JSONB DEFAULT '[]',
  topics TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_conv_user ON calla_conversations(user_id);

-- 3. Study sessions
CREATE TABLE IF NOT EXISTS calla_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES calla_conversations(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('quiz', 'flashcard', 'test')),
  domains TEXT[] DEFAULT '{}',
  duration_minutes INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  topics_flagged_weak TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_sessions_user ON calla_study_sessions(user_id);

-- 4. Classroom logs
CREATE TABLE IF NOT EXISTS calla_classroom_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_name TEXT NOT NULL,
  duration_minutes INTEGER,
  is_mannequin BOOLEAN DEFAULT true,
  photo_urls TEXT[] DEFAULT '{}',
  self_assessment INTEGER CHECK (self_assessment BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_classroom_user ON calla_classroom_logs(user_id);

-- 5. Floor logs
CREATE TABLE IF NOT EXISTS calla_floor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_completion_id UUID,
  service_type TEXT NOT NULL,
  client_identifier TEXT,
  products_used TEXT[] DEFAULT '{}',
  formula_notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_floor_user ON calla_floor_logs(user_id);

-- 6. Exam content bank
CREATE TABLE IF NOT EXISTS calla_exam_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('question', 'flashcard')),
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  front_text TEXT,
  back_text TEXT,
  difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  state TEXT DEFAULT 'NM',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_exam_domain ON calla_exam_content(domain);
CREATE INDEX idx_calla_exam_type ON calla_exam_content(content_type);
CREATE INDEX idx_calla_exam_topic ON calla_exam_content(domain, topic);

-- 7. Topic performance tracking
CREATE TABLE IF NOT EXISTS calla_topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  questions_seen INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  flagged_weak BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, domain, topic)
);

CREATE INDEX idx_calla_perf_user ON calla_topic_performance(user_id);
CREATE INDEX idx_calla_perf_weak ON calla_topic_performance(user_id) WHERE flagged_weak = true;

-- 8. Technique reviews (photo coaching)
CREATE TABLE IF NOT EXISTS calla_technique_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  technique_category TEXT NOT NULL,
  analysis JSONB,
  feedback_text TEXT,
  score INTEGER CHECK (score BETWEEN 1 AND 10),
  previous_review_id UUID REFERENCES calla_technique_reviews(id) ON DELETE SET NULL,
  improvement_delta DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_reviews_user ON calla_technique_reviews(user_id);

-- 9. Progression (XP, level, streak)
CREATE TABLE IF NOT EXISTS calla_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  streak_freezes_available INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_calla_progression_user ON calla_progression(user_id);

-- 10. Achievements
CREATE TABLE IF NOT EXISTS calla_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_calla_achievements_user ON calla_achievements(user_id);

-- 11. XP log (audit trail)
CREATE TABLE IF NOT EXISTS calla_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calla_xp_user ON calla_xp_log(user_id);

-- ============================================================
-- RLS Policies — students can only see their own data
-- ============================================================

ALTER TABLE calla_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profiles" ON calla_profiles FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_conversations" ON calla_conversations FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON calla_study_sessions FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_classroom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_classroom_logs" ON calla_classroom_logs FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_floor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_floor_logs" ON calla_floor_logs FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_exam_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read_exam_content" ON calla_exam_content FOR SELECT USING (true);

ALTER TABLE calla_topic_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_performance" ON calla_topic_performance FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_technique_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_reviews" ON calla_technique_reviews FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_progression" ON calla_progression FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_achievements" ON calla_achievements FOR ALL USING (user_id = auth.uid());

ALTER TABLE calla_xp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_xp_log" ON calla_xp_log FOR ALL USING (user_id = auth.uid());
```

**Step 2: Run the migration**

```bash
# Via the admin API endpoint (existing pattern)
curl -X POST http://localhost:3000/api/admin/run-migrations
```

Or apply directly via Supabase dashboard SQL editor.

**Step 3: Commit**

```bash
git add migrations/2026-04-13-calla-study-companion.sql
git commit -m "feat(calla): add database schema — 12 tables with RLS"
```

---

## Task 2: Seed Exam Content

**Files:**
- Create: `migrations/2026-04-13-calla-exam-seed.sql`

**Step 1: Write the seed migration**

Seed ~50 questions + ~25 flashcards per domain across 5 NIC domains. Include NM-specific regulatory content. Structure each question with 4 options (A/B/C/D), correct answer, and explanation.

Domains:
1. Scientific Concepts (chemistry, bacteriology, anatomy)
2. Hair Design (cutting, styling, coloring, chemical texture)
3. Skin Care (facials, hair removal, makeup)
4. Nail Care (manicure, pedicure, nail enhancements)
5. Professional Practices (sanitation, business, NM law)

Example format for questions:
```sql
INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, question_text, options, correct_answer, explanation, difficulty, state) VALUES
('Scientific Concepts', 'Chemistry', 'pH Scale', 'question',
 'What is the pH range of most hair products used in the salon?',
 '["A. 0 to 3", "B. 4 to 6", "C. 4.5 to 5.5", "D. 8 to 14"]',
 'C', 'Most salon products are formulated within the pH range of 4.5 to 5.5 to match the natural pH of hair and skin.',
 2, 'NM');
```

Example format for flashcards:
```sql
INSERT INTO calla_exam_content (domain, topic, subtopic, content_type, front_text, back_text, difficulty, state) VALUES
('Scientific Concepts', 'Chemistry', 'pH Scale', 'flashcard',
 'What is the natural pH of hair and skin?',
 'The natural pH of hair and skin is between 4.5 and 5.5 (slightly acidic). This is called the acid mantle.',
 1, 'NM');
```

Write 10 questions + 5 flashcards per domain for the initial seed (50 questions + 25 flashcards total). Content should be accurate NIC exam material with NM regulatory additions for Professional Practices domain.

**Step 2: Commit**

```bash
git add migrations/2026-04-13-calla-exam-seed.sql
git commit -m "feat(calla): seed exam content — 50 questions + 25 flashcards across 5 NIC domains"
```

---

## Task 3: DB Functions & Types

**Files:**
- Create: `src/lib/db/calla.ts`
- Modify: `src/lib/types.ts` (append Calla types)

**Step 1: Add Calla types to `src/lib/types.ts`**

Append to the end of the file (do not modify existing types):

```typescript
// ── Calla Study Companion ──────────────────────────────────

export interface CallaProfile {
  id: string;
  userId: string;
  programStage: 'just_started' | 'few_months' | 'almost_done' | 'boards_soon' | 'licensed';
  primaryWorry: string | null;
  textbook: string;
  strongAreas: string[];
  weakAreas: string[];
  studyPreference: string[];
  state: string;
  onboardingCompletedAt: string | null;
}

export interface CallaConversation {
  id: string;
  userId: string;
  title: string;
  mode: 'chat' | 'quiz' | 'flashcard' | 'test';
  messages: CallaMessage[];
  topics: string[];
  startedAt: string;
  lastMessageAt: string;
}

export interface CallaMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'quiz' | 'flashcard' | 'test_question';
  metadata?: Record<string, unknown>;
}

export interface CallaStudySession {
  id: string;
  userId: string;
  conversationId: string | null;
  mode: 'quiz' | 'flashcard' | 'test';
  domains: string[];
  durationMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  accuracyPercentage: number;
  topicsFlaggedWeak: string[];
}

export interface CallaExamContent {
  id: string;
  domain: string;
  topic: string;
  subtopic: string | null;
  contentType: 'question' | 'flashcard';
  questionText: string | null;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  frontText: string | null;
  backText: string | null;
  difficulty: number;
  state: string;
}

export interface CallaClassroomLog {
  id: string;
  userId: string;
  techniqueName: string;
  durationMinutes: number | null;
  isMannequin: boolean;
  photoUrls: string[];
  selfAssessment: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CallaFloorLog {
  id: string;
  userId: string;
  serviceType: string;
  clientIdentifier: string | null;
  productsUsed: string[];
  formulaNotes: string | null;
  photoUrls: string[];
  outcomeNotes: string | null;
  createdAt: string;
}

export interface CallaTechniqueReview {
  id: string;
  userId: string;
  photoUrl: string;
  techniqueCategory: string;
  analysis: Record<string, unknown> | null;
  feedbackText: string | null;
  score: number | null;
  previousReviewId: string | null;
  improvementDelta: number | null;
  createdAt: string;
}

export interface CallaProgression {
  id: string;
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezesAvailable: number;
  lastActivityDate: string | null;
}

export interface CallaAchievement {
  achievementKey: string;
  earnedAt: string;
}

export interface CallaTopicPerformance {
  domain: string;
  topic: string;
  questionsSeen: number;
  questionsCorrect: number;
  accuracyPercentage: number;
  flaggedWeak: boolean;
}
```

**Step 2: Create `src/lib/db/calla.ts`**

Follow the exact pattern from `src/lib/db/clients.ts` — use `createSupabaseAdminClient()`, return null on error, never throw.

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CallaProfile,
  CallaConversation,
  CallaMessage,
  CallaClassroomLog,
  CallaFloorLog,
  CallaExamContent,
  CallaStudySession,
  CallaTopicPerformance,
  CallaTechniqueReview,
  CallaProgression,
  CallaAchievement,
} from "@/lib/types";

// ── Profile ──────────────────────────────────────────────────

export async function getCallaProfile(userId: string): Promise<CallaProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    programStage: data.program_stage,
    primaryWorry: data.primary_worry,
    textbook: data.textbook,
    strongAreas: data.strong_areas || [],
    weakAreas: data.weak_areas || [],
    studyPreference: data.study_preference || [],
    state: data.state,
    onboardingCompletedAt: data.onboarding_completed_at,
  };
}

export async function createCallaProfile(userId: string, input: {
  programStage: string;
  primaryWorry?: string;
  textbook?: string;
  strongAreas?: string[];
  weakAreas?: string[];
  studyPreference?: string[];
  state?: string;
}): Promise<CallaProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_profiles")
    .insert({
      user_id: userId,
      program_stage: input.programStage,
      primary_worry: input.primaryWorry || null,
      textbook: input.textbook || "Milady",
      strong_areas: input.strongAreas || [],
      weak_areas: input.weakAreas || [],
      study_preference: input.studyPreference || [],
      state: input.state || "NM",
      onboarding_completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createCallaProfile] Insert failed:", error?.message);
    return null;
  }

  // Initialize progression row
  await admin.from("calla_progression").insert({
    user_id: userId,
    total_xp: 0,
    current_level: 1,
    current_streak: 0,
    longest_streak: 0,
    streak_freezes_available: 0,
    last_activity_date: null,
  });

  return {
    id: data.id,
    userId: data.user_id,
    programStage: data.program_stage,
    primaryWorry: data.primary_worry,
    textbook: data.textbook,
    strongAreas: data.strong_areas || [],
    weakAreas: data.weak_areas || [],
    studyPreference: data.study_preference || [],
    state: data.state,
    onboardingCompletedAt: data.onboarding_completed_at,
  };
}

// ── Conversations ────────────────────────────────────────────

export async function listCallaConversations(userId: string): Promise<CallaConversation[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    userId: c.user_id as string,
    title: c.title as string,
    mode: c.mode as CallaConversation["mode"],
    messages: (c.messages as CallaMessage[]) || [],
    topics: (c.topics as string[]) || [],
    startedAt: c.started_at as string,
    lastMessageAt: c.last_message_at as string,
  }));
}

export async function getCallaConversation(conversationId: string, userId: string): Promise<CallaConversation | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    mode: data.mode,
    messages: data.messages || [],
    topics: data.topics || [],
    startedAt: data.started_at,
    lastMessageAt: data.last_message_at,
  };
}

export async function createCallaConversation(userId: string, title?: string, mode?: string): Promise<CallaConversation | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_conversations")
    .insert({
      user_id: userId,
      title: title || "New conversation",
      mode: mode || "chat",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    mode: data.mode,
    messages: [],
    topics: [],
    startedAt: data.started_at,
    lastMessageAt: data.last_message_at,
  };
}

export async function appendCallaMessage(conversationId: string, userId: string, message: CallaMessage): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  // Get current messages
  const { data: conv } = await admin
    .from("calla_conversations")
    .select("messages")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!conv) return false;

  const messages = [...(conv.messages || []), message];

  const { error } = await admin
    .from("calla_conversations")
    .update({
      messages,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("user_id", userId);

  return !error;
}

// ── Logging ──────────────────────────────────────────────────

export async function createClassroomLog(userId: string, input: {
  techniqueName: string;
  durationMinutes?: number;
  isMannequin?: boolean;
  photoUrls?: string[];
  selfAssessment?: number;
  notes?: string;
}): Promise<CallaClassroomLog | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_classroom_logs")
    .insert({
      user_id: userId,
      technique_name: input.techniqueName,
      duration_minutes: input.durationMinutes || null,
      is_mannequin: input.isMannequin ?? true,
      photo_urls: input.photoUrls || [],
      self_assessment: input.selfAssessment || null,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    techniqueName: data.technique_name,
    durationMinutes: data.duration_minutes,
    isMannequin: data.is_mannequin,
    photoUrls: data.photo_urls || [],
    selfAssessment: data.self_assessment,
    notes: data.notes,
    createdAt: data.created_at,
  };
}

export async function createFloorLog(userId: string, input: {
  serviceType: string;
  clientIdentifier?: string;
  productsUsed?: string[];
  formulaNotes?: string;
  photoUrls?: string[];
  outcomeNotes?: string;
  serviceCompletionId?: string;
}): Promise<CallaFloorLog | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_floor_logs")
    .insert({
      user_id: userId,
      service_type: input.serviceType,
      client_identifier: input.clientIdentifier || null,
      products_used: input.productsUsed || [],
      formula_notes: input.formulaNotes || null,
      photo_urls: input.photoUrls || [],
      outcome_notes: input.outcomeNotes || null,
      service_completion_id: input.serviceCompletionId || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    serviceType: data.service_type,
    clientIdentifier: data.client_identifier,
    productsUsed: data.products_used || [],
    formulaNotes: data.formula_notes,
    photoUrls: data.photo_urls || [],
    outcomeNotes: data.outcome_notes,
    createdAt: data.created_at,
  };
}

export async function listCallaLogs(userId: string, limit = 20): Promise<{ classroom: CallaClassroomLog[]; floor: CallaFloorLog[] }> {
  const admin = createSupabaseAdminClient();

  const [classroomResult, floorResult] = await Promise.all([
    admin.from("calla_classroom_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    admin.from("calla_floor_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
  ]);

  const classroom = (classroomResult.data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    userId: d.user_id as string,
    techniqueName: d.technique_name as string,
    durationMinutes: d.duration_minutes as number | null,
    isMannequin: d.is_mannequin as boolean,
    photoUrls: (d.photo_urls as string[]) || [],
    selfAssessment: d.self_assessment as number | null,
    notes: d.notes as string | null,
    createdAt: d.created_at as string,
  }));

  const floor = (floorResult.data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    userId: d.user_id as string,
    serviceType: d.service_type as string,
    clientIdentifier: d.client_identifier as string | null,
    productsUsed: (d.products_used as string[]) || [],
    formulaNotes: d.formula_notes as string | null,
    photoUrls: (d.photo_urls as string[]) || [],
    outcomeNotes: d.outcome_notes as string | null,
    createdAt: d.created_at as string,
  }));

  return { classroom, floor };
}

// ── Exam Content ─────────────────────────────────────────────

export async function getExamQuestions(params: {
  domain?: string;
  topic?: string;
  contentType?: 'question' | 'flashcard';
  difficulty?: number;
  limit?: number;
  excludeIds?: string[];
}): Promise<CallaExamContent[]> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("calla_exam_content").select("*");

  if (params.domain) query = query.eq("domain", params.domain);
  if (params.topic) query = query.eq("topic", params.topic);
  if (params.contentType) query = query.eq("content_type", params.contentType);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);
  if (params.excludeIds?.length) query = query.not("id", "in", `(${params.excludeIds.join(",")})`);

  const { data, error } = await query.limit(params.limit || 20);
  if (error || !data) return [];

  return data.map((d: Record<string, unknown>) => ({
    id: d.id as string,
    domain: d.domain as string,
    topic: d.topic as string,
    subtopic: d.subtopic as string | null,
    contentType: d.content_type as 'question' | 'flashcard',
    questionText: d.question_text as string | null,
    options: d.options as string[] | null,
    correctAnswer: d.correct_answer as string | null,
    explanation: d.explanation as string | null,
    frontText: d.front_text as string | null,
    backText: d.back_text as string | null,
    difficulty: d.difficulty as number,
    state: d.state as string,
  }));
}

// ── Topic Performance ────────────────────────────────────────

export async function getTopicPerformance(userId: string): Promise<CallaTopicPerformance[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_topic_performance")
    .select("*")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map((d: Record<string, unknown>) => ({
    domain: d.domain as string,
    topic: d.topic as string,
    questionsSeen: d.questions_seen as number,
    questionsCorrect: d.questions_correct as number,
    accuracyPercentage: Number(d.accuracy_percentage),
    flaggedWeak: d.flagged_weak as boolean,
  }));
}

export async function updateTopicPerformance(userId: string, domain: string, topic: string, correct: boolean): Promise<void> {
  const admin = createSupabaseAdminClient();

  // Upsert: increment counters
  const { data: existing } = await admin
    .from("calla_topic_performance")
    .select("*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .eq("topic", topic)
    .single();

  const seen = (existing?.questions_seen || 0) + 1;
  const correctCount = (existing?.questions_correct || 0) + (correct ? 1 : 0);
  const accuracy = seen > 0 ? (correctCount / seen) * 100 : 0;
  const flaggedWeak = seen >= 3 && accuracy < 60;

  if (existing) {
    await admin.from("calla_topic_performance").update({
      questions_seen: seen,
      questions_correct: correctCount,
      accuracy_percentage: accuracy,
      flagged_weak: flaggedWeak,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await admin.from("calla_topic_performance").insert({
      user_id: userId,
      domain,
      topic,
      questions_seen: seen,
      questions_correct: correctCount,
      accuracy_percentage: accuracy,
      flagged_weak: flaggedWeak,
    });
  }
}

// ── Technique Reviews ────────────────────────────────────────

export async function createTechniqueReview(userId: string, input: {
  photoUrl: string;
  techniqueCategory: string;
  analysis?: Record<string, unknown>;
  feedbackText?: string;
  score?: number;
}): Promise<CallaTechniqueReview | null> {
  const admin = createSupabaseAdminClient();

  // Find previous review for same category to calculate improvement
  const { data: previousReview } = await admin
    .from("calla_technique_reviews")
    .select("id, score")
    .eq("user_id", userId)
    .eq("technique_category", input.techniqueCategory)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const improvementDelta = previousReview?.score && input.score
    ? input.score - previousReview.score
    : null;

  const { data, error } = await admin
    .from("calla_technique_reviews")
    .insert({
      user_id: userId,
      photo_url: input.photoUrl,
      technique_category: input.techniqueCategory,
      analysis: input.analysis || null,
      feedback_text: input.feedbackText || null,
      score: input.score || null,
      previous_review_id: previousReview?.id || null,
      improvement_delta: improvementDelta,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    photoUrl: data.photo_url,
    techniqueCategory: data.technique_category,
    analysis: data.analysis,
    feedbackText: data.feedback_text,
    score: data.score,
    previousReviewId: data.previous_review_id,
    improvementDelta: data.improvement_delta ? Number(data.improvement_delta) : null,
    createdAt: data.created_at,
  };
}

export async function getTechniqueHistory(userId: string): Promise<CallaTechniqueReview[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_technique_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((d: Record<string, unknown>) => ({
    id: d.id as string,
    userId: d.user_id as string,
    photoUrl: d.photo_url as string,
    techniqueCategory: d.technique_category as string,
    analysis: d.analysis as Record<string, unknown> | null,
    feedbackText: d.feedback_text as string | null,
    score: d.score as number | null,
    previousReviewId: d.previous_review_id as string | null,
    improvementDelta: d.improvement_delta ? Number(d.improvement_delta) : null,
    createdAt: d.created_at as string,
  }));
}

// ── Progression & XP ─────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 100, 350, 750, 1500, 3000, 5500, 9000, 14000, 20000, 25000];

function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 31) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  return 1.0;
}

export async function getProgression(userId: string): Promise<CallaProgression | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_progression")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    totalXp: data.total_xp,
    currentLevel: data.current_level,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    streakFreezesAvailable: data.streak_freezes_available,
    lastActivityDate: data.last_activity_date,
  };
}

export async function awardXp(userId: string, actionType: string, baseXp: number, referenceId?: string): Promise<{ xpEarned: number; newTotal: number; leveledUp: boolean; newLevel: number }> {
  const admin = createSupabaseAdminClient();

  // Get current progression
  const { data: prog } = await admin
    .from("calla_progression")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!prog) {
    return { xpEarned: 0, newTotal: 0, leveledUp: false, newLevel: 1 };
  }

  // Update streak
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = prog.last_activity_date;
  let newStreak = prog.current_streak;

  if (!lastActivity) {
    newStreak = 1;
  } else {
    const lastDate = new Date(lastActivity);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, streak unchanged
    } else if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays === 2 && prog.streak_freezes_available > 0) {
      // Use a freeze
      newStreak += 1;
      await admin.from("calla_progression").update({
        streak_freezes_available: prog.streak_freezes_available - 1,
      }).eq("id", prog.id);
    } else {
      newStreak = 1;
    }
  }

  const multiplier = getStreakMultiplier(newStreak);
  const xpEarned = Math.round(baseXp * multiplier);
  const newTotal = prog.total_xp + xpEarned;
  const oldLevel = prog.current_level;
  const newLevel = calculateLevel(newTotal);
  const leveledUp = newLevel > oldLevel;

  // Log XP
  await admin.from("calla_xp_log").insert({
    user_id: userId,
    action_type: actionType,
    xp_earned: xpEarned,
    multiplier,
    reference_id: referenceId || null,
  });

  // Update progression
  await admin.from("calla_progression").update({
    total_xp: newTotal,
    current_level: newLevel,
    current_streak: newStreak,
    longest_streak: Math.max(prog.longest_streak, newStreak),
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  }).eq("id", prog.id);

  // Check for streak-based freeze unlocks
  if (newLevel >= 5 && prog.streak_freezes_available === 0) {
    await admin.from("calla_progression").update({
      streak_freezes_available: 2,
    }).eq("id", prog.id);
  }

  return { xpEarned, newTotal, leveledUp, newLevel };
}

// ── Achievements ─────────────────────────────────────────────

const ACHIEVEMENT_DEFINITIONS: Record<string, { name: string; check: (stats: AchievementCheckStats) => boolean }> = {
  first_steps: { name: "First Steps", check: (s) => s.totalSessions >= 1 },
  consistent_7: { name: "Consistent", check: (s) => s.longestStreak >= 7 },
  dedicated_30: { name: "Dedicated", check: (s) => s.longestStreak >= 30 },
  quiz_master: { name: "Quiz Master", check: (s) => s.quizzesPassed >= 20 },
  perfect_score: { name: "Perfect Score", check: (s) => s.perfectTests >= 1 },
  floor_ready: { name: "Floor Ready", check: (s) => s.floorLogs >= 10 },
  technique_growth: { name: "Technique Growth", check: (s) => s.techniqueImprovements >= 3 },
  domain_master: { name: "Domain Master", check: (s) => s.domainsMastered >= 1 },
  board_prep: { name: "Board Prep Complete", check: (s) => s.practiceTests >= 5 },
  study_buddy: { name: "Study Buddy", check: (s) => s.totalStudyMinutes >= 600 },
};

interface AchievementCheckStats {
  totalSessions: number;
  longestStreak: number;
  quizzesPassed: number;
  perfectTests: number;
  floorLogs: number;
  techniqueImprovements: number;
  domainsMastered: number;
  practiceTests: number;
  totalStudyMinutes: number;
}

export async function checkAndAwardAchievements(userId: string): Promise<CallaAchievement[]> {
  const admin = createSupabaseAdminClient();

  // Get existing achievements
  const { data: existing } = await admin
    .from("calla_achievements")
    .select("achievement_key")
    .eq("user_id", userId);

  const earnedKeys = new Set((existing || []).map((a: Record<string, unknown>) => a.achievement_key as string));

  // Gather stats
  const [sessions, progression, floorLogs, reviews, perfData] = await Promise.all([
    admin.from("calla_study_sessions").select("mode, accuracy_percentage, duration_minutes").eq("user_id", userId),
    admin.from("calla_progression").select("*").eq("user_id", userId).single(),
    admin.from("calla_floor_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("calla_technique_reviews").select("improvement_delta").eq("user_id", userId).gt("improvement_delta", 4),
    admin.from("calla_topic_performance").select("domain, accuracy_percentage").eq("user_id", userId),
  ]);

  const sessionData = sessions.data || [];
  const quizzesPassed = sessionData.filter((s: Record<string, unknown>) => s.mode === "quiz" && (s.accuracy_percentage as number) >= 70).length;
  const perfectTests = sessionData.filter((s: Record<string, unknown>) => s.mode === "test" && (s.accuracy_percentage as number) >= 95).length;
  const practiceTests = sessionData.filter((s: Record<string, unknown>) => s.mode === "test").length;
  const totalStudyMinutes = sessionData.reduce((sum: number, s: Record<string, unknown>) => sum + ((s.duration_minutes as number) || 0), 0);

  // Check domain mastery (80%+ accuracy across all topics in a domain)
  const domainAccuracies: Record<string, number[]> = {};
  for (const p of (perfData.data || []) as Record<string, unknown>[]) {
    const domain = p.domain as string;
    if (!domainAccuracies[domain]) domainAccuracies[domain] = [];
    domainAccuracies[domain].push(Number(p.accuracy_percentage));
  }
  const domainsMastered = Object.values(domainAccuracies).filter(
    (accs) => accs.length >= 3 && accs.every((a) => a >= 80)
  ).length;

  const stats: AchievementCheckStats = {
    totalSessions: sessionData.length,
    longestStreak: progression.data?.longest_streak || 0,
    quizzesPassed,
    perfectTests,
    floorLogs: floorLogs.count || 0,
    techniqueImprovements: (reviews.data || []).length,
    domainsMastered,
    practiceTests,
    totalStudyMinutes,
  };

  const newAchievements: CallaAchievement[] = [];

  for (const [key, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (!earnedKeys.has(key) && def.check(stats)) {
      const { error } = await admin.from("calla_achievements").insert({
        user_id: userId,
        achievement_key: key,
      });
      if (!error) {
        newAchievements.push({ achievementKey: key, earnedAt: new Date().toISOString() });
      }
    }
  }

  return newAchievements;
}

export async function getAchievements(userId: string): Promise<CallaAchievement[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("calla_achievements")
    .select("achievement_key, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true });

  if (error || !data) return [];
  return data.map((d: Record<string, unknown>) => ({
    achievementKey: d.achievement_key as string,
    earnedAt: d.earned_at as string,
  }));
}

// ── Study Sessions ───────────────────────────────────────────

export async function createStudySession(userId: string, input: {
  conversationId?: string;
  mode: 'quiz' | 'flashcard' | 'test';
  domains: string[];
  durationMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  topicsFlaggedWeak?: string[];
}): Promise<CallaStudySession | null> {
  const admin = createSupabaseAdminClient();
  const accuracy = input.questionsAttempted > 0
    ? (input.questionsCorrect / input.questionsAttempted) * 100
    : 0;

  const { data, error } = await admin
    .from("calla_study_sessions")
    .insert({
      user_id: userId,
      conversation_id: input.conversationId || null,
      mode: input.mode,
      domains: input.domains,
      duration_minutes: input.durationMinutes,
      questions_attempted: input.questionsAttempted,
      questions_correct: input.questionsCorrect,
      accuracy_percentage: accuracy,
      topics_flagged_weak: input.topicsFlaggedWeak || [],
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    conversationId: data.conversation_id,
    mode: data.mode,
    domains: data.domains || [],
    durationMinutes: data.duration_minutes,
    questionsAttempted: data.questions_attempted,
    questionsCorrect: data.questions_correct,
    accuracyPercentage: Number(data.accuracy_percentage),
    topicsFlaggedWeak: data.topics_flagged_weak || [],
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/db/calla.ts
git commit -m "feat(calla): add types and database functions"
```

---

## Task 4: Metis Kernel Integration

**Files:**
- Modify: `src/lib/kernel.ts` (append new functions)
- Create: `src/lib/intelligence/buildCallaContext.ts`

**Step 1: Add Calla kernel functions to `src/lib/kernel.ts`**

Append after the existing `metisChat` function:

```typescript
// --- CALLA STUDY COMPANION ---

export async function callaChat(params: {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  studentContext: Record<string, unknown>;
  mode?: string;
}): Promise<MetisChatResponse | null> {
  const result = await kernelPost("/api/v1/ai/calla-chat", {
    message: params.message,
    conversation_history: params.conversationHistory,
    student_context: params.studentContext,
    mode: params.mode || "chat",
  }, 30000);
  return result ?? null;
}

export async function callaAnalyzeTechnique(params: {
  imageUrl: string;
  techniqueCategory: string;
  studentContext: Record<string, unknown>;
}): Promise<{
  analysis: Record<string, unknown>;
  feedbackText: string;
  score: number;
} | null> {
  return kernelPost("/api/v1/ai/analyze-technique", {
    image_url: params.imageUrl,
    technique_category: params.techniqueCategory,
    student_context: params.studentContext,
  }, 30000);
}
```

**Step 2: Create `src/lib/intelligence/buildCallaContext.ts`**

Follow the pattern from `buildFullContext.ts` — parallel Supabase queries, shaped context object:

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCallaProfile,
  getTopicPerformance,
  getProgression,
  listCallaLogs,
} from "@/lib/db/calla";

export interface CallaContext {
  student: {
    programStage: string;
    primaryWorry: string | null;
    textbook: string;
    strongAreas: string[];
    weakAreas: string[];
    studyPreference: string[];
    state: string;
  };
  performance: {
    domain: string;
    topic: string;
    accuracy: number;
    flaggedWeak: boolean;
  }[];
  recentLogs: {
    type: 'classroom' | 'floor';
    name: string;
    date: string;
    notes: string | null;
  }[];
  progression: {
    level: number;
    totalXp: number;
    currentStreak: number;
    lastActivity: string | null;
  };
  recentTechniqueReviews: {
    category: string;
    score: number | null;
    date: string;
  }[];
}

export async function buildCallaContext(userId: string): Promise<CallaContext | null> {
  const [profile, performance, progression, logs] = await Promise.all([
    getCallaProfile(userId),
    getTopicPerformance(userId),
    getProgression(userId),
    listCallaLogs(userId, 10),
  ]);

  if (!profile) return null;

  // Get recent technique reviews
  const admin = createSupabaseAdminClient();
  const { data: reviews } = await admin
    .from("calla_technique_reviews")
    .select("technique_category, score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentLogs = [
    ...logs.classroom.map((l) => ({
      type: 'classroom' as const,
      name: l.techniqueName,
      date: l.createdAt,
      notes: l.notes,
    })),
    ...logs.floor.map((l) => ({
      type: 'floor' as const,
      name: l.serviceType,
      date: l.createdAt,
      notes: l.outcomeNotes,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return {
    student: {
      programStage: profile.programStage,
      primaryWorry: profile.primaryWorry,
      textbook: profile.textbook,
      strongAreas: profile.strongAreas,
      weakAreas: profile.weakAreas,
      studyPreference: profile.studyPreference,
      state: profile.state,
    },
    performance: performance.map((p) => ({
      domain: p.domain,
      topic: p.topic,
      accuracy: p.accuracyPercentage,
      flaggedWeak: p.flaggedWeak,
    })),
    recentLogs,
    progression: {
      level: progression?.currentLevel || 1,
      totalXp: progression?.totalXp || 0,
      currentStreak: progression?.currentStreak || 0,
      lastActivity: progression?.lastActivityDate || null,
    },
    recentTechniqueReviews: (reviews || []).map((r: Record<string, unknown>) => ({
      category: r.technique_category as string,
      score: r.score as number | null,
      date: r.created_at as string,
    })),
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/kernel.ts src/lib/intelligence/buildCallaContext.ts
git commit -m "feat(calla): add Metis kernel integration and context builder"
```

---

## Task 5: API Routes — Onboarding & Profile

**Files:**
- Create: `src/app/api/calla/onboarding/route.ts`
- Create: `src/app/api/calla/profile/route.ts`

**Step 1: Create onboarding route**

Follow the exact pattern from `src/app/api/intelligence/chat/route.ts`:

```typescript
// src/app/api/calla/onboarding/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCallaProfile, createClassroomLog } from "@/lib/db/calla";
import { callaChat } from "@/lib/kernel";
import { buildCallaContext } from "@/lib/intelligence/buildCallaContext";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { programStage, primaryWorry, textbook, strongAreas, weakAreas, studyPreference, state, firstLogEntry } = body;

    if (!programStage) {
      return NextResponse.json({ error: "programStage is required" }, { status: 400 });
    }

    // Create profile
    const profile = await createCallaProfile(user.id, {
      programStage,
      primaryWorry: primaryWorry || null,
      textbook: textbook || "Milady",
      strongAreas: strongAreas || [],
      weakAreas: weakAreas || [],
      studyPreference: studyPreference || [],
      state: state || "NM",
    });

    if (!profile) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    // Create first classroom log from the "one thing you did" answer
    if (firstLogEntry?.trim()) {
      await createClassroomLog(user.id, {
        techniqueName: "First entry",
        notes: firstLogEntry.trim(),
      });
    }

    // Generate personalized welcome message from Metis
    const context = await buildCallaContext(user.id);
    let welcomeMessage = null;

    if (context) {
      const result = await callaChat({
        message: `New student just completed onboarding. Generate a warm, personalized welcome message with 2-3 specific next actions based on their profile. They are ${programStage.replace("_", " ")}, worried about ${primaryWorry || "the exam"}, using ${textbook || "Milady"}, and their weak areas are: ${(weakAreas || []).join(", ") || "not specified yet"}.${firstLogEntry ? ` They just shared: "${firstLogEntry}"` : ""}`,
        conversationHistory: [],
        studentContext: context as unknown as Record<string, unknown>,
      });
      welcomeMessage = result?.reply || null;
    }

    return NextResponse.json({ profile, welcomeMessage });
  } catch (err) {
    console.error("Calla onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create profile route**

```typescript
// src/app/api/calla/profile/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCallaProfile } from "@/lib/db/calla";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getCallaProfile(user.id);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Calla profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/calla/
git commit -m "feat(calla): add onboarding and profile API routes"
```

---

## Task 6: API Routes — Chat & Conversations

**Files:**
- Create: `src/app/api/calla/chat/route.ts`
- Create: `src/app/api/calla/conversations/route.ts`
- Create: `src/app/api/calla/conversations/[id]/route.ts`

**Step 1: Create chat route**

```typescript
// src/app/api/calla/chat/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callaChat } from "@/lib/kernel";
import { buildCallaContext } from "@/lib/intelligence/buildCallaContext";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message, conversationHistory = [], mode } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const context = await buildCallaContext(user.id);
    if (!context) {
      return NextResponse.json({ error: "Complete onboarding first" }, { status: 403 });
    }

    const result = await callaChat({
      message: message.trim(),
      conversationHistory,
      studentContext: context as unknown as Record<string, unknown>,
      mode,
    });

    if (!result) {
      return NextResponse.json({ error: "Calla is unavailable right now" }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Calla chat error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create conversations list/create route**

```typescript
// src/app/api/calla/conversations/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCallaConversations, createCallaConversation } from "@/lib/db/calla";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await listCallaConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("Calla conversations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const conversation = await createCallaConversation(user.id, body.title, body.mode);

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("Calla create conversation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Create conversation detail route**

```typescript
// src/app/api/calla/conversations/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCallaConversation } from "@/lib/db/calla";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const conversation = await getCallaConversation(id, user.id);

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("Calla get conversation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/calla/
git commit -m "feat(calla): add chat and conversation API routes"
```

---

## Task 7: API Routes — Logging, Quiz, Flashcards, Test, Technique, Stats

**Files:**
- Create: `src/app/api/calla/log/classroom/route.ts`
- Create: `src/app/api/calla/log/floor/route.ts`
- Create: `src/app/api/calla/logs/route.ts`
- Create: `src/app/api/calla/quiz/start/route.ts`
- Create: `src/app/api/calla/quiz/answer/route.ts`
- Create: `src/app/api/calla/flashcards/[domain]/route.ts`
- Create: `src/app/api/calla/test/start/route.ts`
- Create: `src/app/api/calla/test/submit/route.ts`
- Create: `src/app/api/calla/technique/review/route.ts`
- Create: `src/app/api/calla/technique/history/route.ts`
- Create: `src/app/api/calla/stats/route.ts`
- Create: `src/app/api/calla/achievements/route.ts`
- Create: `src/app/api/calla/leaderboard/[type]/route.ts`

All routes follow the same auth pattern. Each route is small — auth check, call db function, return JSON. Write each one following the established pattern. Key implementation notes:

**Quiz start:** Query `calla_exam_content` weighted toward weak topics from `calla_topic_performance`. Return 10 questions. Adaptive: if accuracy > 80% increase difficulty, < 50% decrease.

**Quiz answer:** Validate answer against `calla_exam_content`, call `updateTopicPerformance()`, call `awardXp()` based on result, call `checkAndAwardAchievements()`.

**Flashcards:** Return flashcards for the requested domain, excluding ones the student has already mastered (accuracy > 90% on that topic).

**Test start:** Return 60 random questions across all domains, NIC format. Include a `test_session_id` for tracking.

**Test submit:** Receive all 60 answers, grade them, create `calla_study_sessions`, update all topic performance, award XP (150 base), check achievements. Return detailed breakdown.

**Technique review:** Accept photo upload (multipart or base64 URL), store in Supabase Storage at `calla-techniques/{user_id}/{timestamp}`, call `callaAnalyzeTechnique()`, save review with `createTechniqueReview()`, award XP.

**Stats:** Return `getProgression()` + `getTopicPerformance()` + study session summary.

**Leaderboard:** Query `calla_progression` ordered by the requested type (weekly_xp, streak, quiz_accuracy, most_improved). Limit 20. Only return users who have opted in (add `leaderboard_opt_in` boolean to `calla_profiles` — add column in migration).

**Step 1: Write all route files**

Each file follows the exact same pattern as Tasks 5-6. The implementation details are in the db function layer (`src/lib/db/calla.ts`), so routes are thin wrappers.

**Step 2: Commit**

```bash
git add src/app/api/calla/
git commit -m "feat(calla): add all remaining API routes — logging, quiz, flashcards, test, technique, stats"
```

---

## Task 8: Navigation Integration

**Files:**
- Modify: `src/app/app/_components/AppNav.tsx`

**Step 1: Add Calla to the navigation**

In `AppNav.tsx`, add Calla to the `NAV_SECTIONS` array and `NAV_VISIBILITY` map. Use `GraduationCap` icon from lucide-react.

Add to the "Practice" section (or create a "Learning" section):

```typescript
// In NAV_SECTIONS, add to appropriate section:
{ href: "/app/calla", label: "Calla", icon: GraduationCap },
```

Add visibility rule:
```typescript
// In NAV_VISIBILITY:
"/app/calla": ["god", "school", "practitioner"],
```

**Step 2: Commit**

```bash
git add src/app/app/_components/AppNav.tsx
git commit -m "feat(calla): add Calla tab to app navigation"
```

---

## Task 9: Calla Layout & Onboarding Gate

**Files:**
- Create: `src/app/app/calla/layout.tsx`
- Create: `src/app/app/calla/onboarding/page.tsx`

**Step 1: Create Calla layout with onboarding gate**

The layout checks for a Calla profile. If none exists, redirect to onboarding. Otherwise render children.

```typescript
// src/app/app/calla/layout.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Calla — Study Companion",
};

export default async function CallaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if student has completed onboarding
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("calla_profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .single();

  const isOnboarding = !profile?.onboarding_completed_at;
  const isOnOnboardingPage = false; // Will be determined by the child route

  // If no profile, only allow the onboarding page
  // The actual redirect logic happens in page.tsx

  return <>{children}</>;
}
```

**Step 2: Create onboarding page**

Build the 7-screen onboarding flow as a client component. Use the existing design system colors. Each step is a card with a question and input controls.

```typescript
// src/app/app/calla/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ... Full 7-step onboarding component
// See Task 10 for the complete UI implementation
```

**Step 3: Commit**

```bash
git add src/app/app/calla/
git commit -m "feat(calla): add layout with onboarding gate"
```

---

## Task 10: Onboarding UI

**Files:**
- Create: `src/app/app/calla/onboarding/page.tsx`
- Create: `src/app/app/calla/_components/CallaOnboarding.tsx`

**Step 1: Build the 7-step onboarding component**

Follow the design system: Fraunces for headings, DM Sans for body. Garnet for primary buttons. Bark tones for Calla's personality. Stone for backgrounds.

Each step renders as a centered card with:
- Step indicator dots at top
- Question text (Calla's voice — warm, plainspoken)
- Input controls (radio buttons, chip selectors, text areas)
- Next/Back buttons

The component manages local state for all 7 answers, then POSTs to `/api/calla/onboarding` on completion. On success, redirects to `/app/calla` with the welcome message.

Screen 1 uses the exact copy from the spec:
> "I'm Calla. Welcome to Opélle.
> I'm going to be with you through school, through your boards, and into your first year on the floor.
> Let's start simple — how far into your program are you?"

**Step 2: Create the page wrapper**

```typescript
// src/app/app/calla/onboarding/page.tsx
"use client";
import CallaOnboarding from "../_components/CallaOnboarding";

export default function CallaOnboardingPage() {
  return <CallaOnboarding />;
}
```

**Step 3: Commit**

```bash
git add src/app/app/calla/
git commit -m "feat(calla): build 7-step onboarding UI"
```

---

## Task 11: Main Chat Interface

**Files:**
- Create: `src/app/app/calla/page.tsx`
- Create: `src/app/app/calla/_components/CallaChat.tsx`
- Create: `src/app/app/calla/_components/MessageBubble.tsx`
- Create: `src/app/app/calla/_components/QuickActions.tsx`
- Create: `src/app/app/calla/_components/ModeIndicator.tsx`

**Step 1: Build CallaChat component**

Follow the pattern from `src/app/app/metis/_components/MetisChat.tsx` (1231 lines) — same message state management, conversation persistence, and send flow. Key differences:

- Quick action bar with pills: "Quiz me", "Flashcards", "Practice test", "Log practice"
- Mode indicator showing current mode
- Calla-specific styling (bark/garnet palette instead of brass/stone)
- Conversation sidebar for history
- Route to `/api/calla/chat` instead of `/api/intelligence/chat`
- No client disambiguation (student context only)

Message bubbles: User messages right-aligned with garnet-blush background. Calla messages left-aligned with stone-light background. Both with the existing markdown renderer.

**Step 2: Build the page**

```typescript
// src/app/app/calla/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CallaChat from "./_components/CallaChat";

export default function CallaPage() {
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/calla/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile?.onboardingCompletedAt) {
          router.replace("/app/calla/onboarding");
        } else {
          setHasProfile(true);
        }
      })
      .catch(() => router.replace("/app/calla/onboarding"));
  }, [router]);

  if (hasProfile === null) return null; // Loading

  return <CallaChat />;
}
```

**Step 3: Commit**

```bash
git add src/app/app/calla/
git commit -m "feat(calla): build main chat interface with message bubbles, quick actions, and mode indicator"
```

---

## Task 12: Quiz Mode (Inline)

**Files:**
- Create: `src/app/app/calla/_components/QuizCard.tsx`
- Modify: `src/app/app/calla/_components/CallaChat.tsx` (add quiz rendering)

**Step 1: Build QuizCard component**

Renders a question card inline in the chat with:
- Domain/topic badge
- Question text
- 4 tappable option buttons (A/B/C/D)
- After answer: green/red highlight + explanation
- Difficulty indicator (1-5 dots)

**Step 2: Add quiz mode to CallaChat**

When user taps "Quiz me" or types it:
1. POST to `/api/calla/quiz/start` → get 10 questions
2. Set mode to "quiz"
3. Render first question as QuizCard inline in messages
4. On answer tap: POST to `/api/calla/quiz/answer` → get feedback + XP
5. Render result, then next question
6. After all questions: show summary (score, XP earned, weak areas)

**Step 3: Commit**

```bash
git add src/app/app/calla/_components/
git commit -m "feat(calla): add inline quiz mode with adaptive questioning"
```

---

## Task 13: Flashcard Mode

**Files:**
- Create: `src/app/app/calla/_components/FlashcardCard.tsx`
- Modify: `src/app/app/calla/_components/CallaChat.tsx` (add flashcard rendering)

**Step 1: Build FlashcardCard component**

Swipeable/tappable card with:
- Front face (question/term)
- Tap to flip animation (CSS transform)
- Back face (answer/definition)
- "Knew it" / "Didn't know" buttons at bottom
- Tracks mastery per card

**Step 2: Add flashcard mode to CallaChat**

When user taps "Flashcards":
1. GET `/api/calla/flashcards/{domain}` (show domain picker first)
2. Set mode to "flashcard"
3. Render cards one at a time
4. Track knew/didn't for session stats
5. Create study session on exit

**Step 3: Commit**

```bash
git add src/app/app/calla/_components/
git commit -m "feat(calla): add flashcard mode with flip animation and mastery tracking"
```

---

## Task 14: Practice Test Mode

**Files:**
- Create: `src/app/app/calla/_components/PracticeTest.tsx`
- Create: `src/app/app/calla/_components/TestResults.tsx`

**Step 1: Build PracticeTest component**

Full-screen overlay (not inline chat) with:
- 90-minute countdown timer in header
- Question counter (1/60)
- Question + 4 options (no immediate feedback)
- Next/Previous navigation
- Flag for review button
- Submit button (with confirmation)

**Step 2: Build TestResults component**

After submission:
- Overall score (percentage + pass/fail based on 75% threshold)
- Domain breakdown (bar chart per domain)
- Weakest areas highlighted
- XP earned
- "Review answers" option (shows correct/wrong for each)

**Step 3: Commit**

```bash
git add src/app/app/calla/_components/
git commit -m "feat(calla): add full practice test mode with timer and detailed results"
```

---

## Task 15: Logging UI

**Files:**
- Create: `src/app/app/calla/log/page.tsx`
- Create: `src/app/app/calla/_components/ClassroomLogForm.tsx`
- Create: `src/app/app/calla/_components/FloorLogForm.tsx`

**Step 1: Build ClassroomLogForm**

Form with:
- Technique name (autocomplete from common list: braiding, sectioning, coloring, cutting, styling, blowout, updo, chemical texture, facials, manicure, pedicure)
- Duration (minutes slider or input)
- Mannequin/Live toggle
- Photo upload (drag-and-drop, Supabase Storage)
- Self-assessment (1-5 stars)
- Notes textarea
- Submit → POST to `/api/calla/log/classroom`

**Step 2: Build FloorLogForm**

Form with:
- Service type dropdown
- Client identifier (text input — initials only)
- Products used (multi-select tags)
- Formula notes (textarea)
- Photo upload
- Outcome notes (textarea)
- Submit → POST to `/api/calla/log/floor`

**Step 3: Build log page with tab switcher**

```typescript
// src/app/app/calla/log/page.tsx
"use client";
import { useState } from "react";
import ClassroomLogForm from "../_components/ClassroomLogForm";
import FloorLogForm from "../_components/FloorLogForm";

export default function CallaLogPage() {
  const [tab, setTab] = useState<"classroom" | "floor">("classroom");
  // Tab switcher + form rendering + recent logs list
}
```

**Step 4: Commit**

```bash
git add src/app/app/calla/
git commit -m "feat(calla): add classroom and floor logging forms"
```

---

## Task 16: Technique Photo Coaching UI

**Files:**
- Create: `src/app/app/calla/_components/TechniqueReview.tsx`

**Step 1: Build TechniqueReview component**

Accessed from classroom log form or standalone "Get feedback" action:
- Photo upload area (drag-and-drop)
- Technique category selector (braiding, sectioning, color application, blending, cutting, styling)
- Submit → loading state with "Calla is analyzing..." message
- Results display: What's working / What to adjust / Try this next (structured from Metis response)
- Score display (1-10 with visual meter)
- If improvement from previous: show delta with celebration

**Step 2: Commit**

```bash
git add src/app/app/calla/_components/TechniqueReview.tsx
git commit -m "feat(calla): add technique photo coaching with Metis vision analysis"
```

---

## Task 17: Stats & Progression Page

**Files:**
- Create: `src/app/app/calla/stats/page.tsx`
- Create: `src/app/app/calla/_components/ProgressionCard.tsx`
- Create: `src/app/app/calla/_components/AchievementGrid.tsx`
- Create: `src/app/app/calla/_components/LeaderboardPanel.tsx`
- Create: `src/app/app/calla/_components/CallaNav.tsx`

**Step 1: Build ProgressionCard**

- Circular level progress ring (XP to next level)
- Level name and number
- Total XP counter
- Streak flame icon with day count
- Multiplier indicator

Use brass colors for XP/gold elements, olive for streak/growth.

**Step 2: Build AchievementGrid**

- 2x5 grid of achievement badges
- Earned ones: full color with earned date
- Unearned: greyed out with progress hint
- Achievement names: First Steps, Consistent, Dedicated, Quiz Master, Perfect Score, Floor Ready, Technique Growth, Domain Master, Board Prep Complete, Study Buddy

**Step 3: Build LeaderboardPanel**

- Tab switcher: Weekly XP, Streak Champions, Quiz Accuracy, Most Improved
- Ranked list with position, avatar placeholder, name, metric
- Current user highlighted
- Opt-in toggle at top

**Step 4: Build CallaNav (tab bar)**

Simple tab bar at top of Calla section: Chat | Log | Stats
Active tab uses garnet underline.

**Step 5: Build stats page**

```typescript
// src/app/app/calla/stats/page.tsx
"use client";
import ProgressionCard from "../_components/ProgressionCard";
import AchievementGrid from "../_components/AchievementGrid";
import LeaderboardPanel from "../_components/LeaderboardPanel";

export default function CallaStatsPage() {
  // Fetch /api/calla/stats, /api/calla/achievements
  // Render ProgressionCard + AchievementGrid + LeaderboardPanel
}
```

**Step 6: Commit**

```bash
git add src/app/app/calla/
git commit -m "feat(calla): add stats page with progression, achievements, and leaderboard"
```

---

## Task 18: Build & Verify

**Step 1: Run TypeScript check**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npx tsc --noEmit
```

Fix any type errors.

**Step 2: Run the build**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npm run build
```

Fix any build errors.

**Step 3: Run existing tests**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && npm test
```

Ensure no existing tests are broken.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(calla): resolve build and type errors"
```

---

## Task 19: Push to GitHub

**Step 1: Push all changes**

```bash
cd /Users/anabellelord/Opelle/opelle-app-github && git push origin main
```

Vercel auto-deploys from main. Verify deployment succeeds.
