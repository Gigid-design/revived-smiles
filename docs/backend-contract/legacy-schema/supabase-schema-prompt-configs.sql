-- ==========================================================================
-- Prompt Configs — Versioned AI prompt configurations
-- Run this AFTER supabase-schema.sql and supabase-schema-photo-analysis.sql
-- ==========================================================================

-- Versioned prompt configurations for photo analysis
CREATE TABLE IF NOT EXISTS prompt_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  label text NOT NULL,
  pose_description text NOT NULL,
  content_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_checks jsonb NOT NULL DEFAULT '[
    {"id":"blur","label":"Blur & focus","requirement":"The image must be in focus and not blurry. Motion blur or out-of-focus teeth should fail."},
    {"id":"lighting","label":"Lighting","requirement":"The teeth area must be well-lit. Too dark or extreme shadows should fail."},
    {"id":"framing","label":"Framing & distance","requirement":"Teeth should fill a reasonable portion of the frame. Too far away or cropped badly should fail."},
    {"id":"glare","label":"Glare & reflections","requirement":"No major glare or reflections on the teeth that obscure detail."}
  ]'::jsonb,
  is_active boolean DEFAULT false,
  created_by text,
  change_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(photo_type, version)
);

ALTER TABLE prompt_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow prompt reads" ON prompt_configs FOR SELECT USING (true);
CREATE POLICY "Allow prompt inserts" ON prompt_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow prompt updates" ON prompt_configs FOR UPDATE USING (true);

-- ==========================================================================
-- Seed data — mirrors the current hardcoded PHOTO_TYPES in route.ts
-- ==========================================================================

INSERT INTO prompt_configs (photo_type, version, label, pose_description, content_checks, is_active)
VALUES
  (
    'close-bite-front', 1,
    'Front View — Teeth Showing',
    'The patient shows their front teeth from a straight-on angle. Lips are pulled back to expose the teeth. A natural bite or a smile are both fine — what matters is that front teeth on both upper and lower jaw are visible. This is NOT a closed-lip photo — the teeth must be showing.',
    '[{"id":"teeth_visible","label":"Teeth showing","requirement":"Both upper and lower front teeth must be visible. A bite, a smile, or lips pulled back with a retractor are all acceptable. Fail ONLY if: lips are closed hiding teeth, only gums are showing, or teeth are too blurry to make out."},{"id":"front_view","label":"Front angle","requirement":"The photo should be roughly from the front — showing both sides of the mouth. A perfectly straight angle is not required; slightly off-center is fine. Fail only if the photo clearly shows just one side of the mouth."}]'::jsonb,
    true
  ),
  (
    'close-bite-side', 1,
    'Side View — Teeth Showing',
    'The patient shows their teeth from the side. The camera is angled so you can see teeth beyond just the front incisors. Lips or cheek are pulled back to expose the side teeth. A bite or slight gap are both fine. It does not matter which side (left or right).',
    '[{"id":"teeth_visible","label":"Teeth showing","requirement":"Teeth must be clearly visible with lips or cheek pulled back. A bite or slight gap are both fine. Fail only if teeth are hidden behind closed lips or the photo doesn''t show teeth at all."},{"id":"side_angle","label":"Side angle","requirement":"The photo should be taken from an angle — not perfectly straight-on from the front. You should see some of the side teeth (premolars or canines beyond the front incisors). A 30-90° angle from the front is fine. Fail only if it''s a straight front-on view showing both sides equally."}]'::jsonb,
    true
  ),
  (
    'open-bite-front', 1,
    'Front View — Mouth Open',
    'The patient has their mouth open so you can see inside. The photo is from the front. The mouth doesn''t need to be extremely wide — just open enough to see the upper teeth and some of the lower teeth or gums. This helps the lab see tooth alignment, spacing, and any missing teeth.',
    '[{"id":"mouth_open","label":"Mouth open","requirement":"The mouth must be open with a visible gap between upper and lower teeth. It doesn''t need to be extremely wide — a comfortable open is fine. Fail only if the teeth are together with no gap, or if the mouth is barely open and you can''t see inside."},{"id":"front_view","label":"Front angle","requirement":"The photo should be roughly from the front. Slightly off-center is acceptable. Fail only if the photo is clearly from the side."}]'::jsonb,
    true
  ),
  (
    'open-bite-side', 1,
    'Side View — Mouth Open',
    'The patient has their mouth open and the photo is taken from the side. Lips or cheek are pulled back so side teeth are visible with the mouth open. The mouth doesn''t need to be extremely wide. It does not matter which side (left or right).',
    '[{"id":"mouth_open","label":"Mouth open","requirement":"The mouth must be open with a visible gap. A comfortable open is fine — it doesn''t need to be extremely wide. Fail only if teeth are together with no gap."},{"id":"side_angle","label":"Side angle","requirement":"The photo should be taken from an angle, not straight-on from the front. You should see some side teeth. A 30-90° angle is fine. Fail only if it''s a straight front-on view."}]'::jsonb,
    true
  )
ON CONFLICT (photo_type, version) DO NOTHING;
