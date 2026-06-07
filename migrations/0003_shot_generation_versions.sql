-- Add generation_versions column to vision_shots for per-shot generation history
ALTER TABLE vision_shots ADD COLUMN IF NOT EXISTS generation_versions JSONB;
