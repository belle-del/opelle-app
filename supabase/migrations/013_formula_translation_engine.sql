-- ============================================================================
-- Module 14: Formula Translation Engine — Tables, RLS, Indexes, Seed Data
-- ============================================================================

-- ─── Global Catalog Tables (no workspace_id) ─────────────────────────────

CREATE TABLE IF NOT EXISTS color_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand VARCHAR(100) NOT NULL,
  line_name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('permanent', 'demi-permanent', 'semi-permanent')),
  characteristics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand, line_name)
);

ALTER TABLE color_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "color_lines_read" ON color_lines FOR SELECT USING (true);
CREATE INDEX idx_color_lines_brand ON color_lines(brand);

CREATE TABLE IF NOT EXISTS color_shades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  color_line_id UUID REFERENCES color_lines(id) ON DELETE CASCADE NOT NULL,
  shade_code VARCHAR(20) NOT NULL,
  shade_name VARCHAR(100) NOT NULL,
  level SMALLINT CHECK (level BETWEEN 1 AND 12),
  primary_tone VARCHAR(10) NOT NULL,
  secondary_tone VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(color_line_id, shade_code)
);

ALTER TABLE color_shades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "color_shades_read" ON color_shades FOR SELECT USING (true);
CREATE INDEX idx_color_shades_line ON color_shades(color_line_id);
CREATE INDEX idx_color_shades_level ON color_shades(level);

-- ─── Workspace-Scoped Tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS universal_color_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  target_level SMALLINT CHECK (target_level BETWEEN 1 AND 12),
  primary_tone VARCHAR(10) NOT NULL,
  secondary_tone VARCHAR(10),
  tone_intensity VARCHAR(10) CHECK (tone_intensity IN ('light', 'medium', 'full')),
  gray_coverage VARCHAR(10) CHECK (gray_coverage IN ('none', 'blend', 'full')),
  technique VARCHAR(30) CHECK (technique IN ('single-process', 'double-process', 'gloss', 'toner')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE universal_color_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ucp_workspace_owner" ON universal_color_profiles
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_ucp_workspace ON universal_color_profiles(workspace_id);

CREATE TABLE IF NOT EXISTS formula_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  universal_profile_id UUID REFERENCES universal_color_profiles(id) ON DELETE CASCADE NOT NULL,
  color_line_id UUID REFERENCES color_lines(id) ON DELETE CASCADE NOT NULL,
  formula JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE formula_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ft_workspace_owner" ON formula_translations
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_ft_workspace ON formula_translations(workspace_id);
CREATE INDEX idx_ft_profile ON formula_translations(universal_profile_id);

CREATE TABLE IF NOT EXISTS translation_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  formula_translation_id UUID REFERENCES formula_translations(id) ON DELETE SET NULL,
  formula_history_id UUID REFERENCES formula_history(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  outcome_success BOOLEAN,
  stylist_feedback TEXT,
  adjustment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE translation_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "to_workspace_owner" ON translation_outcomes
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_to_workspace ON translation_outcomes(workspace_id);
CREATE INDEX idx_to_formula_history ON translation_outcomes(formula_history_id);
CREATE INDEX idx_to_client ON translation_outcomes(client_id);

CREATE TABLE IF NOT EXISTS shade_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_shade_id UUID REFERENCES color_shades(id) ON DELETE CASCADE NOT NULL,
  target_shade_id UUID REFERENCES color_shades(id) ON DELETE CASCADE NOT NULL,
  mapping_confidence NUMERIC(3,2) DEFAULT 0.50,
  outcome_count INTEGER DEFAULT 0,
  adjustment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_shade_id, target_shade_id)
);

ALTER TABLE shade_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_read" ON shade_mappings FOR SELECT USING (true);
CREATE POLICY "sm_owner_write" ON shade_mappings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "sm_owner_update" ON shade_mappings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspaces WHERE owner_id = auth.uid()));
CREATE INDEX idx_sm_source ON shade_mappings(source_shade_id);
CREATE INDEX idx_sm_target ON shade_mappings(target_shade_id);

-- ─── Seed Data: Color Lines ───────────────────────────────────────────────

INSERT INTO color_lines (brand, line_name, type, characteristics) VALUES
  ('Redken', 'Shades EQ', 'demi-permanent', '{"lift": "none", "gray_coverage": "50%", "processing": "20 min"}'),
  ('Redken', 'Color Gels Lacquers', 'permanent', '{"lift": "up to 2 levels", "gray_coverage": "100%", "processing": "20-35 min"}'),
  ('L''Oréal', 'Majirel', 'permanent', '{"lift": "up to 3 levels", "gray_coverage": "100%", "processing": "35 min"}'),
  ('L''Oréal', 'Dia Light', 'demi-permanent', '{"lift": "none", "gray_coverage": "70%", "processing": "20 min"}'),
  ('Wella', 'Koleston Perfect', 'permanent', '{"lift": "up to 4 levels", "gray_coverage": "100%", "processing": "30-40 min"}'),
  ('Wella', 'Color Touch', 'demi-permanent', '{"lift": "none", "gray_coverage": "50%", "processing": "20 min"}'),
  ('Schwarzkopf', 'Igora Royal', 'permanent', '{"lift": "up to 3 levels", "gray_coverage": "100%", "processing": "30-45 min"}'),
  ('Goldwell', 'Topchic', 'permanent', '{"lift": "up to 4 levels", "gray_coverage": "100%", "processing": "30 min"}'),
  ('R+Co', 'R+Co Bleu', 'demi-permanent', '{"lift": "none", "gray_coverage": "blend", "processing": "20 min"}')
ON CONFLICT (brand, line_name) DO NOTHING;

-- ─── Seed Data: Shades ───────────────────────────────────────────────────

-- Redken Shades EQ
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('03N', 'Darkest Brown Natural', 3, 'N', NULL),
  ('04N', 'Medium Brown Natural', 4, 'N', NULL),
  ('05N', 'Light Brown Natural', 5, 'N', NULL),
  ('06N', 'Dark Blonde Natural', 6, 'N', NULL),
  ('06G', 'Dark Blonde Gold', 6, 'G', NULL),
  ('06R', 'Dark Blonde Red', 6, 'R', NULL),
  ('07N', 'Medium Blonde Natural', 7, 'N', NULL),
  ('07A', 'Medium Blonde Ash', 7, 'A', NULL),
  ('07V', 'Medium Blonde Violet', 7, 'V', NULL),
  ('08N', 'Light Blonde Natural', 8, 'N', NULL),
  ('08G', 'Light Blonde Gold', 8, 'G', NULL),
  ('09N', 'Very Light Blonde Natural', 9, 'N', NULL),
  ('09V', 'Very Light Blonde Violet', 9, 'V', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Redken' AND cl.line_name = 'Shades EQ'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- Redken Color Gels Lacquers
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('4NN', 'Dark Brown Natural Natural', 4, 'N', 'N'),
  ('5NN', 'Light Brown Natural Natural', 5, 'N', 'N'),
  ('6NN', 'Dark Blonde Natural Natural', 6, 'N', 'N'),
  ('6NA', 'Dark Blonde Natural Ash', 6, 'N', 'A'),
  ('6RR', 'Dark Blonde Red Red', 6, 'R', 'R'),
  ('7NN', 'Medium Blonde Natural Natural', 7, 'N', 'N'),
  ('8NN', 'Light Blonde Natural Natural', 8, 'N', 'N'),
  ('9NN', 'Very Light Blonde Natural Natural', 9, 'N', 'N'),
  ('10NN', 'Lightest Blonde Natural Natural', 10, 'N', 'N')
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Redken' AND cl.line_name = 'Color Gels Lacquers'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- L'Oréal Majirel
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('4', 'Brown', 4, 'N', NULL),
  ('5', 'Light Brown', 5, 'N', NULL),
  ('5.1', 'Light Ash Brown', 5, 'A', NULL),
  ('6', 'Dark Blonde', 6, 'N', NULL),
  ('6.1', 'Dark Ash Blonde', 6, 'A', NULL),
  ('6.3', 'Dark Golden Blonde', 6, 'G', NULL),
  ('7', 'Blonde', 7, 'N', NULL),
  ('7.1', 'Ash Blonde', 7, 'A', NULL),
  ('7.4', 'Copper Blonde', 7, 'R', NULL),
  ('8', 'Light Blonde', 8, 'N', NULL),
  ('8.1', 'Light Ash Blonde', 8, 'A', NULL),
  ('9', 'Very Light Blonde', 9, 'N', NULL),
  ('10', 'Lightest Blonde', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'L''Oréal' AND cl.line_name = 'Majirel'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- L'Oréal Dia Light
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('5.11', 'Light Brown Intense Ash', 5, 'A', 'A'),
  ('6.13', 'Dark Blonde Ash Gold', 6, 'A', 'G'),
  ('7.13', 'Blonde Ash Gold', 7, 'A', 'G'),
  ('7.23', 'Blonde Iridescent Gold', 7, 'V', 'G'),
  ('8.13', 'Light Blonde Ash Gold', 8, 'A', 'G'),
  ('8.23', 'Light Blonde Iridescent Gold', 8, 'V', 'G'),
  ('9.13', 'Very Light Blonde Ash Gold', 9, 'A', 'G'),
  ('9.32', 'Very Light Blonde Gold Iridescent', 9, 'G', 'V'),
  ('10.13', 'Lightest Blonde Ash Gold', 10, 'A', 'G')
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'L''Oréal' AND cl.line_name = 'Dia Light'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- Wella Koleston Perfect
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('4/0', 'Medium Brown', 4, 'N', NULL),
  ('5/0', 'Light Brown', 5, 'N', NULL),
  ('6/0', 'Dark Blonde', 6, 'N', NULL),
  ('6/1', 'Dark Ash Blonde', 6, 'A', NULL),
  ('6/7', 'Dark Brown Blonde', 6, 'B', NULL),
  ('7/0', 'Medium Blonde', 7, 'N', NULL),
  ('7/1', 'Medium Ash Blonde', 7, 'A', NULL),
  ('7/3', 'Medium Gold Blonde', 7, 'G', NULL),
  ('8/0', 'Light Blonde', 8, 'N', NULL),
  ('8/1', 'Light Ash Blonde', 8, 'A', NULL),
  ('9/0', 'Very Light Blonde', 9, 'N', NULL),
  ('10/0', 'Lightest Blonde', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Wella' AND cl.line_name = 'Koleston Perfect'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- Wella Color Touch
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('5/0', 'Light Brown', 5, 'N', NULL),
  ('6/0', 'Dark Blonde', 6, 'N', NULL),
  ('6/7', 'Dark Blonde Brown', 6, 'B', NULL),
  ('7/0', 'Medium Blonde', 7, 'N', NULL),
  ('7/1', 'Medium Ash Blonde', 7, 'A', NULL),
  ('7/7', 'Medium Blonde Brown', 7, 'B', NULL),
  ('8/0', 'Light Blonde', 8, 'N', NULL),
  ('8/3', 'Light Gold Blonde', 8, 'G', NULL),
  ('9/0', 'Very Light Blonde', 9, 'N', NULL),
  ('9/16', 'Very Light Blonde Ash Violet', 9, 'A', 'V'),
  ('10/0', 'Lightest Blonde', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Wella' AND cl.line_name = 'Color Touch'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- Schwarzkopf Igora Royal
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('4-0', 'Medium Brown', 4, 'N', NULL),
  ('5-0', 'Light Brown', 5, 'N', NULL),
  ('6-0', 'Dark Blonde', 6, 'N', NULL),
  ('6-1', 'Dark Ash Blonde', 6, 'A', NULL),
  ('6-4', 'Dark Blonde Beige', 6, 'G', NULL),
  ('7-0', 'Medium Blonde', 7, 'N', NULL),
  ('7-1', 'Medium Ash Blonde', 7, 'A', NULL),
  ('7-4', 'Medium Blonde Beige', 7, 'G', NULL),
  ('8-0', 'Light Blonde', 8, 'N', NULL),
  ('8-1', 'Light Ash Blonde', 8, 'A', NULL),
  ('9-0', 'Extra Light Blonde', 9, 'N', NULL),
  ('10-0', 'Ultra Blonde', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Schwarzkopf' AND cl.line_name = 'Igora Royal'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- Goldwell Topchic
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('4N', 'Medium Brown Natural', 4, 'N', NULL),
  ('5N', 'Light Brown Natural', 5, 'N', NULL),
  ('6N', 'Dark Blonde Natural', 6, 'N', NULL),
  ('6A', 'Dark Blonde Ash', 6, 'A', NULL),
  ('6G', 'Dark Blonde Gold', 6, 'G', NULL),
  ('7N', 'Medium Blonde Natural', 7, 'N', NULL),
  ('7A', 'Medium Blonde Ash', 7, 'A', NULL),
  ('8N', 'Light Blonde Natural', 8, 'N', NULL),
  ('8A', 'Light Blonde Ash', 8, 'A', NULL),
  ('9N', 'Very Light Blonde Natural', 9, 'N', NULL),
  ('10N', 'Lightest Blonde Natural', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'Goldwell' AND cl.line_name = 'Topchic'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;

-- R+Co Bleu
INSERT INTO color_shades (color_line_id, shade_code, shade_name, level, primary_tone, secondary_tone)
SELECT cl.id, s.shade_code, s.shade_name, s.level, s.primary_tone, s.secondary_tone
FROM color_lines cl,
(VALUES
  ('5N', 'Light Brown Natural', 5, 'N', NULL),
  ('6N', 'Dark Blonde Natural', 6, 'N', NULL),
  ('6G', 'Dark Blonde Gold', 6, 'G', NULL),
  ('7N', 'Medium Blonde Natural', 7, 'N', NULL),
  ('7A', 'Medium Blonde Ash', 7, 'A', NULL),
  ('8N', 'Light Blonde Natural', 8, 'N', NULL),
  ('8V', 'Light Blonde Violet', 8, 'V', NULL),
  ('9N', 'Very Light Blonde Natural', 9, 'N', NULL),
  ('10N', 'Lightest Blonde Natural', 10, 'N', NULL)
) AS s(shade_code, shade_name, level, primary_tone, secondary_tone)
WHERE cl.brand = 'R+Co' AND cl.line_name = 'R+Co Bleu'
ON CONFLICT (color_line_id, shade_code) DO NOTHING;
