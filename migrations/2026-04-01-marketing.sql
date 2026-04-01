-- Module 11: Marketing & Communications
-- Creates message_logs, automation_rules, campaigns tables
-- Adds birthday column to clients

-- 1. Message logs — track every outbound message
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  template_id UUID,
  source TEXT NOT NULL CHECK (source IN ('manual','automation','campaign','cron')),
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms')),
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','delivered','opened','clicked')),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Automation rules — trigger → condition → action
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('appointment_booked','service_completed','days_since_visit','client_birthday')),
  conditions JSONB DEFAULT '{}',
  template_id UUID,
  delay_minutes INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaigns — one-time sends to filtered audiences
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  name TEXT NOT NULL,
  template_id UUID,
  audience_filter JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  recipients_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add birthday to clients for birthday trigger
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthday DATE;

-- 5. RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ws_owner_message_logs') THEN
    CREATE POLICY "ws_owner_message_logs" ON message_logs FOR ALL
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ws_owner_automation_rules') THEN
    CREATE POLICY "ws_owner_automation_rules" ON automation_rules FOR ALL
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ws_owner_campaigns') THEN
    CREATE POLICY "ws_owner_campaigns" ON campaigns FOR ALL
      USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_workspace ON message_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_client ON message_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_sent_at ON message_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_rules_workspace ON automation_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
