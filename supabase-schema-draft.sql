-- Progressive Draft Save — Schema Migration
-- Run this against your Supabase project SQL editor.

-- 1. Add user_id column (links to auth.users)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. Document the valid statuses for the status column
COMMENT ON COLUMN submissions.status IS
  'Workflow status: draft | pending | in_review | approved | rejected | changes_requested';

-- 3. Allow authenticated users to update their own draft submissions
CREATE POLICY "Users can update own drafts" ON submissions
  FOR UPDATE USING (
    user_id = auth.uid() AND status = 'draft'
  );

-- 4. Allow authenticated users to read their own submissions
CREATE POLICY "Users can read own submissions" ON submissions
  FOR SELECT USING (
    user_id = auth.uid()
  );
