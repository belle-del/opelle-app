# Formula Translation Engine Infrastructure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the data infrastructure for formula translation — universal color shade catalog, outcome tracking, owner-only dashboard, and auto-capture hook into service completions.

**Architecture:** 6 new DB tables (2 global catalog + 4 workspace-scoped), seed data for 9 color lines, 7 owner-only API endpoints, 1 dashboard page, 1 auto-capture hook into existing service completion flow. All new tables use RLS. Translation outcomes reference `formula_history` for photos/formula data (no duplication).

**Tech Stack:** Next.js App Router, Supabase (admin client bypasses RLS), TypeScript, Lucide icons, Opelle CSS custom properties

---

### Task 1: Add `translations.manage` permission

**Files:**
- Modify: `src/lib/permissions.ts`

**Step 1: Add the permission to the type union and arrays**

Add `'translations.manage'` to the `Permission` type union (after `'marketing.view'`):

```typescript
  | 'translations.manage';
```

Add it to `ALL_PERMISSIONS` array:

```typescript
  'marketing.manage', 'marketing.view',
  'translations.manage',
];
```

Add it to the `owner` role. Since `owner` gets `[...ALL_PERMISSIONS]`, it's automatic. Verify no other role gets it — only owner should have `translations.manage`.

**Step 2: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat(translations): add translations.manage permission (owner only)"
```

---

### Task 2: Create database migration — tables + RLS + seed data

**Files:**
- Create: `supabase/migrations/013_formula_translation_engine.sql`

**Step 1: Write the migration**

```sql
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

-- ─── Seed Data: Shades (levels 3-10, common tones per line) ───────────────
-- Using a representative subset per line. Owners can add more via API.

-- Helper: insert shades for a given brand+line with standard tones
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
```

**Step 2: Run the migration against the live Supabase instance**

Since this project uses Supabase hosted (not local), run the migration SQL directly via the Supabase dashboard SQL editor, or via curl:

```bash
# The migration file is for reference. Apply via Supabase dashboard SQL editor
# or use the admin client to run the SQL.
```

Alternatively, create a one-off script to apply it:

```bash
source .env.local
curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "https://qccrfgkfcdcezxzdtfpk.supabase.co/rest/v1/rpc/exec_sql" \
  -d '{"query": "SELECT 1"}'
```

If the RPC approach doesn't work, paste the SQL into the Supabase dashboard SQL editor.

**Step 3: Commit the migration file**

```bash
git add supabase/migrations/013_formula_translation_engine.sql
git commit -m "feat(translations): add color catalog + translation tables + seed data"
```

---

### Task 3: Add TypeScript types for translation engine

**Files:**
- Modify: `src/lib/types.ts` (append at end)

**Step 1: Add the types**

```typescript
// ─── Translation Engine Types ─────────────────────────────────────────────

export type ColorLineType = 'permanent' | 'demi-permanent' | 'semi-permanent';

export type ColorLineRow = {
  id: string;
  brand: string;
  line_name: string;
  type: ColorLineType;
  characteristics: Record<string, string>;
  created_at: string;
};

export type ColorLine = {
  id: string;
  brand: string;
  lineName: string;
  type: ColorLineType;
  characteristics: Record<string, string>;
  createdAt: string;
};

export function colorLineRowToModel(row: ColorLineRow): ColorLine {
  return {
    id: row.id,
    brand: row.brand,
    lineName: row.line_name,
    type: row.type,
    characteristics: row.characteristics || {},
    createdAt: row.created_at,
  };
}

export type ColorShadeRow = {
  id: string;
  color_line_id: string;
  shade_code: string;
  shade_name: string;
  level: number;
  primary_tone: string;
  secondary_tone: string | null;
  created_at: string;
};

export type ColorShade = {
  id: string;
  colorLineId: string;
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone: string | null;
  createdAt: string;
};

export function colorShadeRowToModel(row: ColorShadeRow): ColorShade {
  return {
    id: row.id,
    colorLineId: row.color_line_id,
    shadeCode: row.shade_code,
    shadeName: row.shade_name,
    level: row.level,
    primaryTone: row.primary_tone,
    secondaryTone: row.secondary_tone,
    createdAt: row.created_at,
  };
}

export type TranslationOutcomeRow = {
  id: string;
  workspace_id: string;
  formula_translation_id: string | null;
  formula_history_id: string;
  client_id: string;
  outcome_success: boolean | null;
  stylist_feedback: string | null;
  adjustment_notes: string | null;
  created_at: string;
};

export type TranslationOutcome = {
  id: string;
  workspaceId: string;
  formulaTranslationId: string | null;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess: boolean | null;
  stylistFeedback: string | null;
  adjustmentNotes: string | null;
  createdAt: string;
};

export function translationOutcomeRowToModel(row: TranslationOutcomeRow): TranslationOutcome {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    formulaTranslationId: row.formula_translation_id,
    formulaHistoryId: row.formula_history_id,
    clientId: row.client_id,
    outcomeSuccess: row.outcome_success,
    stylistFeedback: row.stylist_feedback,
    adjustmentNotes: row.adjustment_notes,
    createdAt: row.created_at,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(translations): add ColorLine, ColorShade, TranslationOutcome types"
```

---

### Task 4: Create DB helper functions

**Files:**
- Create: `src/lib/db/translations.ts`

**Step 1: Write the DB helper**

```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ColorLine, ColorLineRow, colorLineRowToModel,
  ColorShade, ColorShadeRow, colorShadeRowToModel,
  TranslationOutcome, TranslationOutcomeRow, translationOutcomeRowToModel,
} from "@/lib/types";

// Re-import the functions (they're also types above but we need the runtime functions)
import {
  colorLineRowToModel as toColorLine,
  colorShadeRowToModel as toShade,
  translationOutcomeRowToModel as toOutcome,
} from "@/lib/types";

// ─── Color Lines ──────────────────────────────────────────────────────────

export async function listColorLines(brand?: string): Promise<(ColorLine & { shadeCount: number })[]> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("color_lines")
    .select("*, color_shades(count)")
    .order("brand", { ascending: true })
    .order("line_name", { ascending: true });

  if (brand) {
    query = query.eq("brand", brand);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => ({
    ...toColorLine(row as ColorLineRow),
    shadeCount: row.color_shades?.[0]?.count ?? 0,
  }));
}

export async function createColorLine(input: {
  brand: string;
  lineName: string;
  type: string;
  characteristics?: Record<string, string>;
}): Promise<ColorLine | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("color_lines")
    .insert({
      brand: input.brand,
      line_name: input.lineName,
      type: input.type,
      characteristics: input.characteristics || {},
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return toColorLine(data as ColorLineRow);
}

// ─── Shades ───────────────────────────────────────────────────────────────

export async function listShades(colorLineId: string): Promise<ColorShade[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("color_shades")
    .select("*")
    .eq("color_line_id", colorLineId)
    .order("level", { ascending: true })
    .order("shade_code", { ascending: true });

  if (error || !data) return [];
  return (data as ColorShadeRow[]).map(toShade);
}

export async function createShades(colorLineId: string, shades: {
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone?: string;
}[]): Promise<number> {
  const admin = createSupabaseAdminClient();
  const rows = shades.map((s) => ({
    color_line_id: colorLineId,
    shade_code: s.shadeCode,
    shade_name: s.shadeName,
    level: s.level,
    primary_tone: s.primaryTone,
    secondary_tone: s.secondaryTone || null,
  }));

  const { error, count } = await admin
    .from("color_shades")
    .upsert(rows, { onConflict: "color_line_id,shade_code", count: "exact" });

  if (error) {
    console.error("createShades error:", error.message);
    return 0;
  }
  return count ?? shades.length;
}

// ─── Translation Outcomes ─────────────────────────────────────────────────

export async function listOutcomes(workspaceId: string, options?: {
  limit?: number;
  offset?: number;
}): Promise<TranslationOutcome[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_outcomes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20) - 1);

  if (error || !data) return [];
  return (data as TranslationOutcomeRow[]).map(toOutcome);
}

export async function createOutcome(input: {
  workspaceId: string;
  formulaTranslationId?: string;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess?: boolean;
  stylistFeedback?: string;
  adjustmentNotes?: string;
}): Promise<TranslationOutcome | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("translation_outcomes")
    .insert({
      workspace_id: input.workspaceId,
      formula_translation_id: input.formulaTranslationId || null,
      formula_history_id: input.formulaHistoryId,
      client_id: input.clientId,
      outcome_success: input.outcomeSuccess ?? null,
      stylist_feedback: input.stylistFeedback || null,
      adjustment_notes: input.adjustmentNotes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createOutcome error:", error?.message);
    return null;
  }
  return toOutcome(data as TranslationOutcomeRow);
}

// ─── Stats & Data Quality ─────────────────────────────────────────────────

export async function getTranslationStats(workspaceId: string) {
  const admin = createSupabaseAdminClient();

  const [formulaCount, outcomeCount, withPhotos, withFeedback, shadeMappingCount] = await Promise.all([
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("before_photo_url", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("stylist_feedback", "is", null),
    admin.from("shade_mappings").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalFormulas: formulaCount.count ?? 0,
    totalOutcomes: outcomeCount.count ?? 0,
    formulasWithPhotos: withPhotos.count ?? 0,
    outcomesWithFeedback: withFeedback.count ?? 0,
    shadeMappings: shadeMappingCount.count ?? 0,
  };
}

export async function getDataQuality(workspaceId: string) {
  const admin = createSupabaseAdminClient();

  const [totalFormulas, withPhotos, totalOutcomes, withFeedback, withSuccess] = await Promise.all([
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("formula_history").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("before_photo_url", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("stylist_feedback", "is", null),
    admin.from("translation_outcomes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("outcome_success", "is", null),
  ]);

  const tf = totalFormulas.count ?? 0;
  const to = totalOutcomes.count ?? 0;

  return {
    totalFormulas: tf,
    formulasWithPhotos: withPhotos.count ?? 0,
    photoPct: tf > 0 ? Math.round(((withPhotos.count ?? 0) / tf) * 100) : 0,
    totalOutcomes: to,
    outcomesWithFeedback: withFeedback.count ?? 0,
    feedbackPct: to > 0 ? Math.round(((withFeedback.count ?? 0) / to) * 100) : 0,
    outcomesWithRating: withSuccess.count ?? 0,
    ratingPct: to > 0 ? Math.round(((withSuccess.count ?? 0) / to) * 100) : 0,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/db/translations.ts
git commit -m "feat(translations): add DB helper functions for color lines, shades, outcomes, stats"
```

---

### Task 5: Create API routes (7 endpoints)

**Files:**
- Create: `src/app/api/translations/stats/route.ts`
- Create: `src/app/api/translations/color-lines/route.ts`
- Create: `src/app/api/translations/shades/route.ts`
- Create: `src/app/api/translations/outcomes/route.ts`
- Create: `src/app/api/translations/data-quality/route.ts`

**Step 1: Create stats route**

File: `src/app/api/translations/stats/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getTranslationStats } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stats = await getTranslationStats(workspaceId);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Translation stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Create color-lines route**

File: `src/app/api/translations/color-lines/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listColorLines, createColorLine } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const brand = req.nextUrl.searchParams.get("brand") || undefined;
    const colorLines = await listColorLines(brand);
    return NextResponse.json({ colorLines });
  } catch (err) {
    console.error("Color lines list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { brand, line_name, type, characteristics } = await req.json();
    if (!brand || !line_name || !type) {
      return NextResponse.json({ error: "brand, line_name, and type are required" }, { status: 400 });
    }

    const colorLine = await createColorLine({
      brand,
      lineName: line_name,
      type,
      characteristics,
    });

    if (!colorLine) {
      return NextResponse.json({ error: "Failed to create color line" }, { status: 500 });
    }

    return NextResponse.json(colorLine, { status: 201 });
  } catch (err) {
    console.error("Color line create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Create shades route**

File: `src/app/api/translations/shades/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listShades, createShades } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const colorLineId = req.nextUrl.searchParams.get("color_line_id");
    if (!colorLineId) {
      return NextResponse.json({ error: "color_line_id required" }, { status: 400 });
    }

    const shades = await listShades(colorLineId);
    return NextResponse.json({ shades });
  } catch (err) {
    console.error("Shades list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { color_line_id, shades } = await req.json();
    if (!color_line_id || !Array.isArray(shades) || shades.length === 0) {
      return NextResponse.json({ error: "color_line_id and non-empty shades array required" }, { status: 400 });
    }

    const count = await createShades(color_line_id, shades.map((s: any) => ({
      shadeCode: s.shade_code,
      shadeName: s.shade_name,
      level: s.level,
      primaryTone: s.primary_tone,
      secondaryTone: s.secondary_tone,
    })));

    return NextResponse.json({ inserted: count }, { status: 201 });
  } catch (err) {
    console.error("Shades create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Create outcomes route**

File: `src/app/api/translations/outcomes/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { listOutcomes, createOutcome } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");

    const outcomes = await listOutcomes(workspaceId, { limit, offset });
    return NextResponse.json({ outcomes });
  } catch (err) {
    console.error("Outcomes list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { formula_history_id, client_id, formula_translation_id, outcome_success, stylist_feedback, adjustment_notes } = await req.json();

    if (!formula_history_id || !client_id) {
      return NextResponse.json({ error: "formula_history_id and client_id required" }, { status: 400 });
    }

    const outcome = await createOutcome({
      workspaceId,
      formulaHistoryId: formula_history_id,
      clientId: client_id,
      formulaTranslationId: formula_translation_id,
      outcomeSuccess: outcome_success,
      stylistFeedback: stylist_feedback,
      adjustmentNotes: adjustment_notes,
    });

    if (!outcome) {
      return NextResponse.json({ error: "Failed to create outcome" }, { status: 500 });
    }

    return NextResponse.json(outcome, { status: 201 });
  } catch (err) {
    console.error("Outcome create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 5: Create data-quality route**

File: `src/app/api/translations/data-quality/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { getDataQuality } from "@/lib/db/translations";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const admin = createSupabaseAdminClient();
    const { data: member } = await admin
      .from("workspace_members")
      .select("role, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const role = (member?.role as TeamRole) || "student";
    const overrides = (member?.permissions as Record<string, boolean>) || {};

    if (!hasPermission(role, "translations.manage", overrides)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quality = await getDataQuality(workspaceId);
    return NextResponse.json(quality);
  } catch (err) {
    console.error("Data quality error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 6: Commit all API routes**

```bash
git add src/app/api/translations/
git commit -m "feat(translations): add 7 owner-only API routes for translation engine"
```

---

### Task 6: Create the owner-only dashboard page

**Files:**
- Create: `src/app/app/translations/page.tsx` (server component — auth guard)
- Create: `src/app/app/translations/_components/TranslationsPage.tsx` (client component — dashboard)

**Step 1: Create the server component (auth guard)**

File: `src/app/app/translations/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceId } from "@/lib/db/get-workspace-id";
import { hasPermission } from "@/lib/permissions";
import type { TeamRole } from "@/lib/permissions";
import { TranslationsPage } from "./_components/TranslationsPage";

export default async function TranslationsRoute() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("role, permissions")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  const role = (member?.role as TeamRole) || "student";
  const overrides = (member?.permissions as Record<string, boolean>) || {};

  if (!hasPermission(role, "translations.manage", overrides)) {
    redirect("/app");
  }

  return <TranslationsPage />;
}
```

**Step 2: Create the client component dashboard**

File: `src/app/app/translations/_components/TranslationsPage.tsx`

This is a large client component. It has 4 sections: Stats, Color Catalog, Outcomes Feed, Data Quality. It fetches from the 4 GET API routes.

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { KPICard } from "@/components/reports/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Palette, CheckCircle, XCircle, Clock } from "lucide-react";

type Stats = {
  totalFormulas: number;
  totalOutcomes: number;
  formulasWithPhotos: number;
  outcomesWithFeedback: number;
  shadeMappings: number;
};

type ColorLine = {
  id: string;
  brand: string;
  lineName: string;
  type: string;
  characteristics: Record<string, string>;
  shadeCount: number;
};

type Shade = {
  id: string;
  shadeCode: string;
  shadeName: string;
  level: number;
  primaryTone: string;
  secondaryTone: string | null;
};

type Outcome = {
  id: string;
  formulaHistoryId: string;
  clientId: string;
  outcomeSuccess: boolean | null;
  stylistFeedback: string | null;
  adjustmentNotes: string | null;
  createdAt: string;
};

type DataQuality = {
  totalFormulas: number;
  formulasWithPhotos: number;
  photoPct: number;
  totalOutcomes: number;
  outcomesWithFeedback: number;
  feedbackPct: number;
  outcomesWithRating: number;
  ratingPct: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function TranslationsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [colorLines, setColorLines] = useState<ColorLine[]>([]);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [shades, setShades] = useState<Record<string, Shade[]>>({});
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/translations/stats").then((r) => r.json()),
      fetch("/api/translations/color-lines").then((r) => r.json()),
      fetch("/api/translations/outcomes?limit=10").then((r) => r.json()),
      fetch("/api/translations/data-quality").then((r) => r.json()),
    ])
      .then(([statsData, linesData, outcomesData, qualityData]) => {
        setStats(statsData);
        setColorLines(linesData.colorLines ?? []);
        setOutcomes(outcomesData.outcomes ?? []);
        setDataQuality(qualityData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadShades = useCallback(async (lineId: string) => {
    if (shades[lineId]) return;
    const res = await fetch(`/api/translations/shades?color_line_id=${lineId}`);
    const data = await res.json();
    setShades((prev) => ({ ...prev, [lineId]: data.shades ?? [] }));
  }, [shades]);

  const toggleLine = (lineId: string) => {
    if (expandedLine === lineId) {
      setExpandedLine(null);
    } else {
      setExpandedLine(lineId);
      loadShades(lineId);
    }
  };

  // Group color lines by brand
  const brandGroups: Record<string, ColorLine[]> = {};
  for (const cl of colorLines) {
    if (!brandGroups[cl.brand]) brandGroups[cl.brand] = [];
    brandGroups[cl.brand].push(cl);
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <header>
          <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6B5D4A", marginBottom: "4px" }}>
            Translation Engine
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
            Formula Translations
          </h2>
        </header>
        <p style={{ fontSize: "12px", color: "#5C5347", textAlign: "center", padding: "48px 0" }}>
          Loading translation data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#4A3C2A", marginBottom: "4px" }}>
          Translation Engine
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "26px", color: "#2C2C24", fontWeight: 300 }}>
          Formula Translations
        </h2>
        <p style={{ fontSize: "12px", color: "#5C5347", marginTop: "4px" }}>
          Infrastructure dashboard — data capture and catalog management
        </p>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Total Formulas" value={stats.totalFormulas} />
          <KPICard label="Total Outcomes" value={stats.totalOutcomes} />
          <KPICard label="With Photos" value={stats.formulasWithPhotos} />
          <KPICard label="With Feedback" value={stats.outcomesWithFeedback} />
        </div>
      )}

      {/* Color Line Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" style={{ color: "#4A3C2A" }} />
            Color Line Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(brandGroups).map(([brand, lines]) => (
            <div key={brand} style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#2C2C24", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
                {brand}
              </p>
              {lines.map((line) => (
                <div key={line.id} style={{ marginBottom: "4px" }}>
                  <button
                    onClick={() => toggleLine(line.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "8px 12px", borderRadius: "6px", border: "none",
                      background: expandedLine === line.id ? "rgba(255,255,255,0.55)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {expandedLine === line.id
                      ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "#5C5347" }} />
                      : <ChevronRight className="w-3.5 h-3.5" style={{ color: "#5C5347" }} />
                    }
                    <span style={{ fontSize: "12px", color: "#2C2C24", fontWeight: 500 }}>{line.lineName}</span>
                    <span style={{ fontSize: "9px", color: "#5C5347", marginLeft: "4px" }}>
                      {line.type} · {line.shadeCount} shades
                    </span>
                  </button>
                  {expandedLine === line.id && shades[line.id] && (
                    <div style={{ padding: "8px 12px 8px 32px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "4px" }}>
                        {shades[line.id].map((s) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "4px 8px", borderRadius: "4px",
                              background: "rgba(255,255,255,0.4)",
                              fontSize: "10px", color: "#2C2C24",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{s.shadeCode}</span>
                            <span style={{ color: "#5C5347", marginLeft: "6px" }}>{s.shadeName}</span>
                            <span style={{ color: "#7A7060", marginLeft: "6px" }}>L{s.level} {s.primaryTone}{s.secondaryTone ? `/${s.secondaryTone}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {colorLines.length === 0 && (
            <p style={{ fontSize: "12px", color: "#5C5347", textAlign: "center", padding: "24px 0" }}>
              No color lines loaded. Run the seed migration to populate.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Outcome Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#5C5347", textAlign: "center", padding: "24px 0" }}>
              No translation outcomes recorded yet. Outcomes are auto-captured when services are completed with formulas.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {outcomes.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {o.outcomeSuccess === true && <CheckCircle className="w-4 h-4" style={{ color: "#4A7C59" }} />}
                    {o.outcomeSuccess === false && <XCircle className="w-4 h-4" style={{ color: "#8B3A3A" }} />}
                    {o.outcomeSuccess === null && <Clock className="w-4 h-4" style={{ color: "#5C5347" }} />}
                    <div>
                      <p style={{ fontSize: "11px", color: "#2C2C24", fontWeight: 500 }}>
                        {o.outcomeSuccess === true ? "Success" : o.outcomeSuccess === false ? "Needs Adjustment" : "Pending Feedback"}
                      </p>
                      {o.stylistFeedback && (
                        <p style={{ fontSize: "9px", color: "#5C5347" }}>{o.stylistFeedback}</p>
                      )}
                      <p style={{ fontSize: "9px", color: "#7A7060" }}>{formatDate(o.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality */}
      {dataQuality && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QualityBar label="Formulas with Photos" count={dataQuality.formulasWithPhotos} total={dataQuality.totalFormulas} pct={dataQuality.photoPct} />
            <QualityBar label="Outcomes with Feedback" count={dataQuality.outcomesWithFeedback} total={dataQuality.totalOutcomes} pct={dataQuality.feedbackPct} />
            <QualityBar label="Outcomes with Rating" count={dataQuality.outcomesWithRating} total={dataQuality.totalOutcomes} pct={dataQuality.ratingPct} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QualityBar({ label, count, total, pct }: { label: string; count: number; total: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between" style={{ marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#2C2C24" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "#5C5347" }}>{count}/{total} ({pct}%)</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(0,0,0,0.06)" }}>
        <div
          style={{
            height: "100%", borderRadius: "3px", width: `${pct}%`,
            background: pct > 50 ? "#4A7C59" : pct > 20 ? "#B8860B" : "#8B3A3A",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/app/translations/
git commit -m "feat(translations): add owner-only translation dashboard page"
```

---

### Task 7: Hook auto-capture into service completion

**Files:**
- Modify: `src/app/api/services/complete/route.ts:162-179` (after formula_history insert)

**Step 1: Add the auto-capture insert**

After line 179 (`formulaHistoryId = fh?.id || null;`), add:

```typescript
    // Auto-capture translation outcome (fire-and-forget)
    if (formulaHistoryId && clientId) {
      admin
        .from("translation_outcomes")
        .insert({
          workspace_id: workspaceId,
          formula_history_id: formulaHistoryId,
          client_id: clientId,
          outcome_success: null,
        })
        .then(() => {})
        .catch(() => {});
    }
```

This is inside the existing `if (formulaData && clientId && completion?.id)` block, so it only fires when a formula was logged. The insert is fire-and-forget — it doesn't block the response.

**Step 2: Commit**

```bash
git add src/app/api/services/complete/route.ts
git commit -m "feat(translations): auto-capture translation outcomes on service completion"
```

---

### Task 8: Push to GitHub (triggers Vercel deploy)

**Step 1: Push all commits**

```bash
git push origin HEAD
```

**Step 2: Apply the migration SQL**

The migration at `supabase/migrations/013_formula_translation_engine.sql` needs to be applied to the live Supabase instance. Copy the SQL content and run it in the Supabase dashboard SQL editor at:
`https://supabase.com/dashboard/project/qccrfgkfcdcezxzdtfpk/sql`

**Step 3: Verify on live site**

- Navigate to `/app/translations` — should show the dashboard (owner only)
- Stats should show current formula_history counts
- Color Line Catalog should show 9 brands with expandable shade lists
- Data Quality bars should render (possibly all 0% if no outcomes yet)
- Non-owner roles should be redirected to `/app`
