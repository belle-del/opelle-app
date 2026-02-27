-- Add default duration to service types
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS default_duration_mins integer;
