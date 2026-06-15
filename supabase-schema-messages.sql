-- Admin ↔ Patient Chat — Schema Migration
-- Run this in your Supabase SQL editor.

CREATE TABLE messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'patient')),
  sender_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_messages_submission ON messages(submission_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Patients can read messages on their own submissions
CREATE POLICY "Patients can read own messages" ON messages
  FOR SELECT USING (
    submission_id IN (
      SELECT id FROM submissions WHERE user_id = auth.uid()
    )
  );

-- Patients can insert messages on their own submissions
CREATE POLICY "Patients can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_role = 'patient' AND
    submission_id IN (
      SELECT id FROM submissions WHERE user_id = auth.uid()
    )
  );

-- Patients can mark messages as read on their own submissions
CREATE POLICY "Patients can mark messages read" ON messages
  FOR UPDATE USING (
    submission_id IN (
      SELECT id FROM submissions WHERE user_id = auth.uid()
    )
  );

-- Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
