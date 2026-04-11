-- ============================================================
-- 016: Opélle Network — Stylist Community Platform
-- Verified work sharing, profiles, engagement, brand partnerships
-- ============================================================

-- Enable uuid generation if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Stylist Specialties (global catalog, like color_lines)
-- ============================================================
CREATE TABLE IF NOT EXISTS stylist_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('color', 'cut', 'texture', 'extensions', 'chemical')),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0
);

-- Seed specialties
INSERT INTO stylist_specialties (name, category, icon, sort_order) VALUES
  ('Balayage', 'color', 'paintbrush', 1),
  ('Highlights', 'color', 'sun', 2),
  ('Color Correction', 'color', 'refresh-cw', 3),
  ('Vivid/Fashion Color', 'color', 'palette', 4),
  ('Root Touch-Up', 'color', 'layers', 5),
  ('All-Over Color', 'color', 'droplet', 6),
  ('Ombré', 'color', 'sunset', 7),
  ('Grey Blending', 'color', 'cloud', 8),
  ('Precision Cut', 'cut', 'scissors', 10),
  ('Layered Cut', 'cut', 'layers', 11),
  ('Pixie/Short Cut', 'cut', 'minimize', 12),
  ('Men''s Cut', 'cut', 'user', 13),
  ('Kids Cut', 'cut', 'smile', 14),
  ('Curly Cut', 'texture', 'wind', 20),
  ('Natural Texture', 'texture', 'waves', 21),
  ('Blowout/Styling', 'texture', 'wind', 22),
  ('Keratin Treatment', 'texture', 'shield', 23),
  ('Tape-In Extensions', 'extensions', 'link', 30),
  ('Hand-Tied Extensions', 'extensions', 'link-2', 31),
  ('Clip-In Extensions', 'extensions', 'paperclip', 32),
  ('Fusion Extensions', 'extensions', 'zap', 33),
  ('Perm', 'chemical', 'rotate-cw', 40),
  ('Relaxer', 'chemical', 'minus-circle', 41),
  ('Brazilian Blowout', 'chemical', 'shield', 42)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Network Profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS network_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  location VARCHAR(200),
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  portfolio_visible BOOLEAN DEFAULT true,
  accepting_clients BOOLEAN DEFAULT false,
  years_experience INTEGER,
  certifications TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  total_services INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE network_profiles ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with own profile
CREATE POLICY "own_profile_all" ON network_profiles
  FOR ALL USING (user_id = auth.uid());

-- Anyone authenticated can view visible profiles
CREATE POLICY "view_visible_profiles" ON network_profiles
  FOR SELECT USING (portfolio_visible = true);

CREATE INDEX idx_network_profiles_workspace ON network_profiles(workspace_id);
CREATE INDEX idx_network_profiles_location ON network_profiles(location);
CREATE INDEX idx_network_profiles_specialties ON network_profiles USING GIN(specialties);

-- ============================================================
-- 3. Network Posts (verified work only)
-- ============================================================
CREATE TABLE IF NOT EXISTS network_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Linked to real work (REQUIRED — no standalone uploads)
  service_completion_id UUID REFERENCES service_completions(id) NOT NULL,
  formula_history_id UUID, -- nullable, references formula_history if exists

  -- Photo URLs (denormalized from formula_history/photos at creation time)
  before_photo_url TEXT,
  after_photo_url TEXT NOT NULL,

  -- Content
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'network', 'followers')),

  -- Engagement counters (denormalized)
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE network_posts ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD own posts
CREATE POLICY "own_posts_all" ON network_posts
  FOR ALL USING (user_id = auth.uid());

-- Authenticated users can view public and network posts
CREATE POLICY "view_public_posts" ON network_posts
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "view_network_posts" ON network_posts
  FOR SELECT USING (visibility = 'network' AND auth.uid() IS NOT NULL);

-- Followers can view followers-only posts
CREATE POLICY "view_followers_posts" ON network_posts
  FOR SELECT USING (
    visibility = 'followers'
    AND user_id IN (
      SELECT following_id FROM network_follows WHERE follower_id = auth.uid()
    )
  );

CREATE INDEX idx_network_posts_user ON network_posts(user_id, created_at DESC);
CREATE INDEX idx_network_posts_discover ON network_posts(created_at DESC) WHERE visibility = 'public';
CREATE INDEX idx_network_posts_service ON network_posts(service_completion_id);
CREATE INDEX idx_network_posts_tags ON network_posts USING GIN(tags);

-- ============================================================
-- 4. Network Follows
-- ============================================================
CREATE TABLE IF NOT EXISTS network_follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE network_follows ENABLE ROW LEVEL SECURITY;

-- Users can manage their own follows
CREATE POLICY "own_follows_insert" ON network_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "own_follows_delete" ON network_follows
  FOR DELETE USING (follower_id = auth.uid());

-- Anyone authenticated can see follows
CREATE POLICY "view_follows" ON network_follows
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_network_follows_follower ON network_follows(follower_id);
CREATE INDEX idx_network_follows_following ON network_follows(following_id);

-- ============================================================
-- 5. Network Likes
-- ============================================================
CREATE TABLE IF NOT EXISTS network_likes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES network_posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE network_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_likes_insert" ON network_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_likes_delete" ON network_likes
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "view_likes" ON network_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_network_likes_post ON network_likes(post_id);

-- ============================================================
-- 6. Network Saves
-- ============================================================
CREATE TABLE IF NOT EXISTS network_saves (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES network_posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE network_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_saves_all" ON network_saves
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_network_saves_post ON network_saves(post_id);
CREATE INDEX idx_network_saves_user ON network_saves(user_id);

-- ============================================================
-- 7. Network Comments (with threading)
-- ============================================================
CREATE TABLE IF NOT EXISTS network_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES network_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  parent_comment_id UUID REFERENCES network_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE network_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_comments" ON network_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "insert_comments" ON network_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_comments" ON network_comments
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_network_comments_post ON network_comments(post_id, created_at);
CREATE INDEX idx_network_comments_parent ON network_comments(parent_comment_id);

-- ============================================================
-- 8. Brand Partnerships (admin-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name VARCHAR(100) NOT NULL,
  brand_logo_url TEXT,
  partnership_type VARCHAR(30) NOT NULL CHECK (partnership_type IN ('attribution', 'sponsorship', 'intelligence')),
  active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS — accessed only via admin client
ALTER TABLE brand_partnerships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. Brand Verified Stylists
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_verified_stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_partnership_id UUID REFERENCES brand_partnerships(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  badge_level VARCHAR(20) CHECK (badge_level IN ('user', 'advocate', 'expert', 'ambassador')),
  last_usage_date DATE,
  sponsored BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_partnership_id, user_id)
);

ALTER TABLE brand_verified_stylists ENABLE ROW LEVEL SECURITY;

-- Users can see their own brand verifications
CREATE POLICY "own_brand_verifications" ON brand_verified_stylists
  FOR SELECT USING (user_id = auth.uid());

-- Public can see verified stylists (for badge display)
CREATE POLICY "view_brand_badges" ON brand_verified_stylists
  FOR SELECT USING (auth.uid() IS NOT NULL AND verified_at IS NOT NULL);

CREATE INDEX idx_brand_verified_user ON brand_verified_stylists(user_id);
CREATE INDEX idx_brand_verified_partnership ON brand_verified_stylists(brand_partnership_id);

-- ============================================================
-- 10. Helper function: update post engagement counts
-- ============================================================
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE network_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE network_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_network_likes_count
  AFTER INSERT OR DELETE ON network_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE OR REPLACE FUNCTION update_post_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE network_posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE network_posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_network_saves_count
  AFTER INSERT OR DELETE ON network_saves
  FOR EACH ROW EXECUTE FUNCTION update_post_saves_count();

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE network_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE network_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_network_comments_count
  AFTER INSERT OR DELETE ON network_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();
