-- Calla Study Companion — Core Tables
-- All 12 tables for the Calla cosmetology student study platform

-- 1. calla_profiles — student profile and onboarding data
CREATE TABLE IF NOT EXISTS calla_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  program_stage TEXT CHECK (program_stage IN ('just_started', 'few_months', 'almost_done', 'boards_soon', 'licensed')),
  primary_worry TEXT,
  textbook TEXT DEFAULT 'Milady',
  strong_areas TEXT[],
  weak_areas TEXT[],
  study_preference TEXT[],
  state TEXT DEFAULT 'NM',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. calla_conversations — chat/quiz/flashcard/test sessions
CREATE TABLE IF NOT EXISTS calla_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT,
  mode TEXT CHECK (mode IN ('chat', 'quiz', 'flashcard', 'test')),
  messages JSONB DEFAULT '[]',
  topics TEXT[],
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. calla_study_sessions — completed study session metrics
CREATE TABLE IF NOT EXISTS calla_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES calla_conversations ON DELETE SET NULL,
  mode TEXT CHECK (mode IN ('quiz', 'flashcard', 'test')),
  domains TEXT[],
  duration_minutes INT,
  questions_attempted INT,
  questions_correct INT,
  accuracy_percentage DECIMAL(5,2),
  topics_flagged_weak TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. calla_classroom_logs — in-school technique practice logs
CREATE TABLE IF NOT EXISTS calla_classroom_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  technique_name TEXT NOT NULL,
  duration_minutes INT,
  is_mannequin BOOLEAN DEFAULT true,
  photo_urls TEXT[],
  self_assessment INT CHECK (self_assessment >= 1 AND self_assessment <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. calla_floor_logs — salon floor service logs
CREATE TABLE IF NOT EXISTS calla_floor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  service_completion_id UUID,
  service_type TEXT NOT NULL,
  client_identifier TEXT,
  products_used TEXT[],
  formula_notes TEXT,
  photo_urls TEXT[],
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. calla_exam_content — exam questions and flashcards (shared/read-only)
CREATE TABLE IF NOT EXISTS calla_exam_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  content_type TEXT CHECK (content_type IN ('question', 'flashcard')),
  question_text TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  front_text TEXT,
  back_text TEXT,
  difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  state TEXT DEFAULT 'NM',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. calla_topic_performance — per-topic accuracy tracking
CREATE TABLE IF NOT EXISTS calla_topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  domain TEXT,
  topic TEXT,
  questions_seen INT DEFAULT 0,
  questions_correct INT DEFAULT 0,
  accuracy_percentage DECIMAL(5,2),
  flagged_weak BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, domain, topic)
);

-- 8. calla_technique_reviews — photo-based technique analysis
CREATE TABLE IF NOT EXISTS calla_technique_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  technique_category TEXT NOT NULL,
  analysis JSONB,
  feedback_text TEXT,
  score INT CHECK (score >= 1 AND score <= 10),
  previous_review_id UUID REFERENCES calla_technique_reviews ON DELETE SET NULL,
  improvement_delta DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. calla_progression — XP, levels, and streaks
CREATE TABLE IF NOT EXISTS calla_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  total_xp INT DEFAULT 0,
  current_level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  streak_freezes_available INT DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. calla_achievements — earned badges/achievements
CREATE TABLE IF NOT EXISTS calla_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

-- 11. calla_xp_log — XP earning history
CREATE TABLE IF NOT EXISTS calla_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  xp_earned INT NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- User-scoped indexes
CREATE INDEX idx_calla_profiles_user ON calla_profiles(user_id);
CREATE INDEX idx_calla_conversations_user ON calla_conversations(user_id);
CREATE INDEX idx_calla_study_sessions_user ON calla_study_sessions(user_id);
CREATE INDEX idx_calla_classroom_logs_user ON calla_classroom_logs(user_id);
CREATE INDEX idx_calla_floor_logs_user ON calla_floor_logs(user_id);
CREATE INDEX idx_calla_topic_performance_user ON calla_topic_performance(user_id);
CREATE INDEX idx_calla_technique_reviews_user ON calla_technique_reviews(user_id);
CREATE INDEX idx_calla_progression_user ON calla_progression(user_id);
CREATE INDEX idx_calla_achievements_user ON calla_achievements(user_id);
CREATE INDEX idx_calla_xp_log_user ON calla_xp_log(user_id);

-- Exam content domain/topic index
CREATE INDEX idx_calla_exam_content_domain_topic ON calla_exam_content(domain, topic);

-- Partial index on flagged_weak topics
CREATE INDEX idx_calla_topic_performance_flagged ON calla_topic_performance(user_id, domain, topic) WHERE flagged_weak = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE calla_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_classroom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_floor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_exam_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_topic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_technique_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calla_xp_log ENABLE ROW LEVEL SECURITY;

-- User-scoped RLS policies (users can only access their own data)
CREATE POLICY "users_manage_own_calla_profiles" ON calla_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_conversations" ON calla_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_study_sessions" ON calla_study_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_classroom_logs" ON calla_classroom_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_floor_logs" ON calla_floor_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_topic_performance" ON calla_topic_performance
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_technique_reviews" ON calla_technique_reviews
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_progression" ON calla_progression
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_achievements" ON calla_achievements
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_calla_xp_log" ON calla_xp_log
  FOR ALL USING (user_id = auth.uid());

-- Exam content is readable by anyone (shared reference data)
CREATE POLICY "anyone_can_read_exam_content" ON calla_exam_content
  FOR SELECT USING (true);
