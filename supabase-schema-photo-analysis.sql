-- Photo Analysis Storage — Schema Migration
-- Run this against your Supabase project SQL editor.

-- Add columns for teeth photo URLs (if not already present from other migration)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS close_bite_photos text[];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS open_bite_photos text[];

-- Add JSONB column to store AI analysis results per photo
-- Structure: { "close-bite-front": { checks, summary, teethCenter, pass }, ... }
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS photo_analyses jsonb DEFAULT '{}';

-- Allow public updates to photo columns (matches existing insert policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public photo updates'
  ) THEN
    CREATE POLICY "Allow public photo updates" ON submissions
      FOR UPDATE USING (true)
      WITH CHECK (true);
  END IF;
END $$;
