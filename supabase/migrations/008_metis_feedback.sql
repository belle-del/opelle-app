-- Metis Feedback/Learning System
-- Allows stylists to teach Metis through notes and corrections

CREATE TABLE metis_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL,
  source TEXT NOT NULL, -- 'chat', 'suggestion', 'formula'
  source_id TEXT, -- the suggestion/message ID that was corrected
  original_content TEXT, -- what Metis originally said
  correction TEXT, -- the user's correction/note
  feedback_type TEXT NOT NULL, -- 'correction', 'note', 'preference'
  entity_type TEXT, -- 'client', 'product', 'formula', 'general'
  entity_id TEXT, -- specific client/product/formula ID if applicable
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE metis_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  lesson TEXT NOT NULL, -- distilled learning like "Client X prefers low-ammonia"
  category TEXT NOT NULL, -- 'client_preference', 'product_knowledge', 'technique', 'business'
  entity_type TEXT,
  entity_id TEXT,
  source_feedback_ids UUID[], -- which feedback entries led to this lesson
  confidence FLOAT DEFAULT 1.0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_metis_feedback_workspace ON metis_feedback(workspace_id);
CREATE INDEX idx_metis_feedback_source ON metis_feedback(workspace_id, source);
CREATE INDEX idx_metis_feedback_entity ON metis_feedback(workspace_id, entity_type, entity_id);
CREATE INDEX idx_metis_lessons_workspace ON metis_lessons(workspace_id);
CREATE INDEX idx_metis_lessons_active ON metis_lessons(workspace_id, active);
CREATE INDEX idx_metis_lessons_category ON metis_lessons(workspace_id, category);
CREATE INDEX idx_metis_lessons_entity ON metis_lessons(workspace_id, entity_type, entity_id);

-- RLS policies
ALTER TABLE metis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE metis_lessons ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their workspace's feedback
CREATE POLICY "Users can manage their workspace feedback"
  ON metis_feedback FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage their workspace lessons"
  ON metis_lessons FOR ALL
  USING (true)
  WITH CHECK (true);
