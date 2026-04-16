-- Module 19 v2: Multi-process timer support
-- Adds processes JSONB column to service_sessions for tracking multiple
-- sequential/parallel processes per service (e.g. bleach + toner + gloss)

ALTER TABLE service_sessions ADD COLUMN IF NOT EXISTS processes JSONB DEFAULT '[]'::jsonb;
