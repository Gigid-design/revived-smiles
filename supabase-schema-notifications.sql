-- ============================================================
-- Notifications table + auto-trigger on submission status change
-- Run this migration against your Supabase project
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'status_update',
  -- types: 'status_update', 'action_required', 'info'
  read boolean DEFAULT false,
  submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by email + read status
CREATE INDEX IF NOT EXISTS idx_notifications_email_read
  ON notifications (email, read);

-- RLS: users can read their own notifications (by email, since no auth.uid() in anon context)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public reads filtered by email (client passes email from auth context)
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (true);

-- Allow marking as read
CREATE POLICY "Users can mark own as read"
  ON notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow inserts (from triggers and admin)
CREATE POLICY "Allow inserts"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Trigger: auto-create notification when submission status changes
-- ============================================================

CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'draft' THEN
    INSERT INTO notifications (user_id, email, title, body, type, submission_id)
    VALUES (
      NEW.user_id,
      NEW.email,
      CASE NEW.status
        WHEN 'in_review' THEN 'Submission under review'
        WHEN 'approved' THEN 'Great news! Submission approved'
        WHEN 'changes_requested' THEN 'Action required: Updates needed'
        WHEN 'rejected' THEN 'Submission update'
        ELSE 'Status update'
      END,
      CASE NEW.status
        WHEN 'in_review' THEN 'Our team is reviewing your submission. We''ll be in touch soon.'
        WHEN 'approved' THEN 'Your submission has been approved! We''re preparing your order.'
        WHEN 'changes_requested' THEN 'Our team needs some updates to your submission. Please review.'
        WHEN 'rejected' THEN 'Unfortunately we can''t process this submission. Please see details.'
        ELSE 'Your submission status has been updated.'
      END,
      CASE WHEN NEW.status = 'changes_requested' THEN 'action_required' ELSE 'status_update' END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if re-running migration
DROP TRIGGER IF EXISTS on_status_change ON submissions;

CREATE TRIGGER on_status_change
  AFTER UPDATE OF status ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_status_change();
