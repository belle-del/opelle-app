-- ============================================================================
-- Enhance Tasks Table
-- Add client associations, notifications, and file attachments
-- ============================================================================

-- Add new columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create index for client_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON public.tasks(reminder_at) WHERE reminder_enabled = true;

-- Add comment for attachments structure
COMMENT ON COLUMN public.tasks.attachments IS 'Array of attachment objects: [{id: string, name: string, url: string, size: number, type: string, uploadedAt: string}]';
