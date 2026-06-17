-- Workflow extension: new columns for fabrication → shipping → completion tracking
-- Run this in your Supabase SQL editor AFTER all previous migrations.

-- Add tracking/shipping columns
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Document the full status lifecycle
COMMENT ON COLUMN submissions.status IS
  'Workflow: draft | pending | in_review | approved | changes_requested | rejected | in_fabrication | shipped | completed';
