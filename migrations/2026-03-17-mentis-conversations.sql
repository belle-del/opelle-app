-- Mentis AI conversation history
CREATE TABLE IF NOT EXISTS mentis_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentis_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES mentis_conversations ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mentis_conv_workspace ON mentis_conversations(workspace_id);
CREATE INDEX idx_mentis_conv_user ON mentis_conversations(user_id);
CREATE INDEX idx_mentis_msg_conv ON mentis_messages(conversation_id);

ALTER TABLE mentis_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentis_messages ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own conversations
CREATE POLICY "users_manage_own_conversations" ON mentis_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "users_manage_own_messages" ON mentis_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM mentis_conversations WHERE user_id = auth.uid())
  );
