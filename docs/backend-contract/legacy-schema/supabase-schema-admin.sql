-- ==========================================================================
-- Admin Portal Schema Migration
-- Run this AFTER the base supabase-schema.sql
-- ==========================================================================

-- Add columns for admin review workflow
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  reviewed_by text;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  reviewed_at timestamp with time zone;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  review_notes text;

-- Teeth photos — currently only in localStorage, need DB persistence
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  close_bite_photos text[];

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  open_bite_photos text[];

-- Document valid status values
-- Valid statuses: 'pending', 'in_review', 'approved', 'rejected', 'changes_requested'
COMMENT ON COLUMN submissions.status IS
  'Workflow status: pending | in_review | approved | rejected | changes_requested';

-- RLS policies for admin access
-- TODO: Replace USING (true) with real auth checks once Supabase Auth is wired up
CREATE POLICY "Allow authenticated reads" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated updates" ON submissions
  FOR UPDATE USING (true);
